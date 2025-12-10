import { Request, Response } from "express";
import { ObjectId } from "bson";
import { db } from "../database/banco-mongo.js";
import { AutenticacaoRequest } from "../middlewares/auth.js";
import Stripe from 'stripe';
import 'dotenv/config'

const stripe = new Stripe(String(process.env.STRIPE_SECRET_KEY));

interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}
interface Carrinho {
    usuarioId: ObjectId;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

class CarrinhoController {

    // MÉTODO (listar)
    async listar(req: AutenticacaoRequest, res: Response) {
        try {
            const { usuarioId } = req;
            if (!usuarioId) {
                return res.status(401).json({ success: false, message: "Usuário não autenticado" });
            }

            // Pipeline de Agregação para cruzar dados do carrinho com produtos atuais
            const pipeline = [
                // 1. Encontrar o carrinho do usuário
                { $match: { usuarioId: new ObjectId(usuarioId) } },

                // 2. Desmembrar o array de itens para processar um por um
                { $unwind: "$itens" },

                // 3. Converter o ID do produto (que está como string no carrinho) para ObjectId
                {
                    $addFields: {
                        produtoObjId: { $toObjectId: "$itens.produtoId" }
                    }
                },

                // 4. Buscar os dados ATUAIS do produto na coleção 'produtos'
                {
                    $lookup: {
                        from: "produtos",
                        localField: "produtoObjId",
                        foreignField: "_id",
                        as: "dadosProdutoAtual"
                    }
                },

                // 5. Transformar o array do lookup em objeto (mantendo vazio se não achar)
                {
                    $unwind: {
                        path: "$dadosProdutoAtual",
                        preserveNullAndEmptyArrays: true
                    }
                },

                // 6. Projetar os dados verificando disponibilidade e preço
                {
                    $project: {
                        _id: 1,
                        usuarioId: 1,
                        dataAtualizacao: 1,
                        item: {
                            produtoId: "$itens.produtoId",
                            nome: "$itens.nome", // Nome original (ou usar do produto atual)
                            quantidade: "$itens.quantidade",
                            // SOLUÇÃO 1: Se 'dadosProdutoAtual' não existe, o produto foi deletado -> indisponível
                            indisponivel: { $cond: [{ $ifNull: ["$dadosProdutoAtual", false] }, false, true] },

                            // SOLUÇÃO 3: Preços
                            // Preço atual (do catálogo) ou 0 se deletado
                            precoAtual: { $ifNull: ["$dadosProdutoAtual.preco", 0] },
                            // Preço que estava salvo no carrinho (antigo)
                            precoNoCarrinho: "$itens.precoUnitario",

                            // Flag para saber se o preço mudou
                            precoMudou: {
                                $cond: {
                                    if: { $ne: ["$itens.precoUnitario", { $ifNull: ["$dadosProdutoAtual.preco", "$itens.precoUnitario"] }] },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    }
                },

                // 7. Reagrupar tudo de volta no formato de carrinho
                {
                    $group: {
                        _id: "$_id",
                        usuarioId: { $first: "$usuarioId" },
                        dataAtualizacao: { $first: "$dataAtualizacao" },
                        itens: {
                            $push: {
                                produtoId: "$item.produtoId",
                                nome: "$item.nome",
                                quantidade: "$item.quantidade",
                                // O front vai usar 'precoUnitario' como o valor real a ser pago (atual)
                                precoUnitario: "$item.precoAtual",
                                precoAntigo: "$item.precoNoCarrinho",
                                indisponivel: "$item.indisponivel",
                                precoMudou: "$item.precoMudou"
                            }
                        },
                        // Recalcular o total apenas com itens DISPONÍVEIS
                        total: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$item.indisponivel", false] },
                                    { $multiply: ["$item.precoAtual", "$item.quantidade"] },
                                    0
                                ]
                            }
                        }
                    }
                }
            ];

            const result = await db.collection('carrinhos').aggregate(pipeline).toArray();

            // Se tiver resultado, precisamos atualizar o valor total no banco para persistir a mudança de preços
            if (result.length > 0) {
                const carrinhoAtualizado = result[0];
                if (!carrinhoAtualizado) {
                    return res.status(200).json({
                        success: true,
                        data: { itens: [], total: 0 }
                    });
                }

                // Atualiza o total e os itens com preços novos no banco para garantir consistência no checkout
                // Nota: Não removemos itens indisponíveis automaticamente, deixamos o usuário ver e remover.
                await db.collection('carrinhos').updateOne(
                    { _id: carrinhoAtualizado._id },
                    {
                        $set: {
                            total: carrinhoAtualizado.total,
                            // Opcional: Se quiser salvar o preço novo no banco permanentemente:
                            // itens: carrinhoAtualizado.itens.map(i => ({...i, precoUnitario: i.precoUnitario})) 
                        }
                    }
                );
            }

            return res.status(200).json({
                success: true,
                data: result[0] || { itens: [], total: 0 }
            });

        } catch (error) {
            console.error('Error fetching cart items:', error);
            return res.status(500).json({ success: false, message: 'Erro ao buscar itens do carrinho.' });
        }
    }

    // MÉTODO (adicionarItem)
    async adicionarItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId, quantidade } = req.body;

        if (!req.usuarioId)
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para adicionar itens." })


        const usuarioObjId = new ObjectId(req.usuarioId);

        if (!ObjectId.isValid(produtoId)) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(400).json({ mensagem: "O produto informado não é válido." });
        }

        const produto = await db.collection("produtos").findOne({ _id: new ObjectId(produtoId) });
        if (!produto) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Produto não encontrado" });
        }

        const precoUnitario = (produto as any).preco;
        const nome = (produto as any).nome;

        // Buscar o carrinho usando o ObjectId do usuário
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });

        if (!carrinho) {
            const novoCarrinho: Carrinho = {
                usuarioId: usuarioObjId,
                itens: [{ produtoId: produtoId, quantidade: quantidade, precoUnitario: precoUnitario, nome: nome }],
                dataAtualizacao: new Date(),
                total: precoUnitario * quantidade
            };
            await db.collection("carrinhos").insertOne(novoCarrinho);
            return res.status(201).json(novoCarrinho);
        }

        const itemExistente = carrinho.itens.find(item => item.produtoId === produtoId);
        if (itemExistente) {
            itemExistente.quantidade += quantidade;
        } else {
            carrinho.itens.push({ produtoId: produtoId, quantidade: quantidade, precoUnitario: precoUnitario, nome: nome });
        }

        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();

        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioObjId },
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }

    // NOVO MÉTODO - TAREFA DA LORENA (Atualizar Quantidade de Item)
    async atualizarQuantidadeItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId, quantidade } = req.body;

        if (!req.usuarioId) {
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para alterar seu carrinho." });
        }

        // Validação da quantidade
        const novaQuantidade = parseInt(quantidade, 10);
        if (isNaN(novaQuantidade) || novaQuantidade < 0) {
            return res.status(400).json({ mensagem: "Quantidade inválida. Deve ser um número maior ou igual a zero." });
        }

        const usuarioObjId = new ObjectId(req.usuarioId);
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });

        if (!carrinho) {
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }

        const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
        if (itemIndex === -1) {
            return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
        }

        // Se a quantidade for 0, remove o item
        if (novaQuantidade === 0) {
            // Verifica se o item ainda existe antes de remover
            if (carrinho.itens[itemIndex]) {
                carrinho.itens.splice(itemIndex, 1);
            } else {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }
        } else {
            // Caso contrário, atualiza a quantidade
            const item = carrinho.itens[itemIndex];
            if (!item) {
                return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
            }
            item.quantidade = novaQuantidade;
        }

        // Recalcula o total
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();

        // Atualiza o carrinho no banco
        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioObjId },
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );

        return res.status(200).json(carrinho);
    }


    // TAREFA DA SARA (Remover Item do Carrinho)
    async removerItem(req: AutenticacaoRequest, res: Response) {
        const { produtoId } = req.body;

        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para remover itens." })

        // Converter para ObjectId
        const usuarioObjId = new ObjectId(req.usuarioId);
        const carrinho = await db.collection<Carrinho>("carrinhos").findOne({ usuarioId: usuarioObjId });

        if (!carrinho) {
            // MENSAGEM AMIGÁVEL BLA BLA BLA (TAREFA SARA)
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }

        const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
        if (itemIndex === -1) {
            // MENSAGEM AMIGÁVEL BLA BLA BLA (TAREFA SARA)
            return res.status(404).json({ mensagem: "Item não encontrado no carrinho" });
        }

        carrinho.itens.splice(itemIndex, 1); // Remove o item
        carrinho.total = carrinho.itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
        carrinho.dataAtualizacao = new Date();

        await db.collection("carrinhos").updateOne(
            { usuarioId: usuarioObjId }, // Atualiza usando ObjectId
            { $set: { itens: carrinho.itens, total: carrinho.total, dataAtualizacao: carrinho.dataAtualizacao } }
        );
        return res.status(200).json(carrinho);
    }

    // MÉTODO REMOVER (TAREFA DA LAÍSA)
    async remover(req: AutenticacaoRequest, res: Response) {
        if (!req.usuarioId)
            return res.status(401).json({ mensagem: "Acesso negado. Faça login para remover seu carrinho." })

        // Converter para ObjectId
        const usuarioObjId = new ObjectId(req.usuarioId);
        const resultado = await db.collection("carrinhos").deleteOne({ usuarioId: usuarioObjId });

        if (resultado.deletedCount === 0) {
            // MENSAGEM AMIGÁVEL (TAREFA SARA)
            return res.status(404).json({ mensagem: "Carrinho não encontrado" });
        }
        return res.status(200).json({ mensagem: "Carrinho removido com sucesso" });
    }
    async criarSessaoCheckout(req: AutenticacaoRequest, res: Response) {
        try {
            const { usuarioId } = req;
            if (!usuarioId) return res.status(401).json({ message: "Não autorizado" });

            // 1. Busca o carrinho do usuário para garantir o valor correto
            const carrinho = await db.collection("carrinhos").findOne({
                usuarioId: new ObjectId(usuarioId)
            });

            if (!carrinho || !carrinho.itens || carrinho.itens.length === 0) {
                return res.status(400).json({ message: "Seu carrinho está vazio." });
            }

            // 2. Calcula o total em CENTAVOS (O Stripe trabalha com inteiros: R$ 10,00 = 1000)
            // A gente recalcula aqui para ninguém fraudar o valor vindo do front
            const totalEmCentavos = Math.round(carrinho.total * 100);

            // 3. Cria a sessão no Stripe
            const session = await stripe.checkout.sessions.create({
                ui_mode: 'embedded',
                payment_method_types: ['card'], // Aceitar cartão
                line_items: [
                    {
                        // Aqui está o segredo: price_data permite valor dinâmico
                        price_data: {
                            currency: 'brl',
                            product_data: {
                                name: 'Total do Carrinho',
                                description: `Pedido com ${carrinho.itens.length} itens`,
                            },
                            unit_amount: totalEmCentavos, // O valor calculado do banco
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                // URL para onde o usuário volta após pagar (ajuste para sua rota do front)
                return_url: `/carrinho`,
            });

            // 4. Retorna o segredo para o Front montar o formulário
            return res.json({ clientSecret: session.client_secret });

        } catch (error) {
            console.error("Erro Stripe:", error);
            return res.status(500).json({ error: "Erro ao criar pagamento" });
        }
    }
}

export default new CarrinhoController()

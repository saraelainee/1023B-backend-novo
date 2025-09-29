import { Request, Response } from "express";
import { db } from "../database/banco-mongo.js";
import { ObjectId } from "mongodb";

// definir a estrutura de um item no carrinho
interface ItemCarrinho {
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nome: string;
}

// Interface para definir a estrutura do carrinho
interface Carrinho {
    _id?: ObjectId;
    usuarioId: string;
    itens: ItemCarrinho[];
    dataAtualizacao: Date;
    total: number;
}

class CarrinhoController {
    /**
     * Adiciona um item ao carrinho de um usuário
     * Se o carrinho não existir ele é criado
     * Se o item já existir no carrinho sua quantidade é incrementada
     */
    async adicionarItem(req: Request, res: Response) {
        try {
            const { usuarioId, produtoId, quantidade } = req.body;
            if (!usuarioId || !produtoId || !quantidade || quantidade <= 0) {
                return res.status(400).json({ error: "Ops, Dados inválidos: usuarioId, produtoId e quantidade (que deve ser maior q zero) são obrigatórios!" });
            }

            //buscar o produto no banco de dados para pegar nome e preço
            const produto = await db.collection('produtos').findOne({ _id: new ObjectId(produtoId) });
            if (!produto) {
                return res.status(404).json({ error: "Ops, produto não encontrado." });
            }

            //Verificar se um carrinho do o usuário já existe
            let carrinho = await db.collection('carrinhos').findOne({ usuarioId: usuarioId }) as Carrinho | null;

            if (carrinho) {
                // se o carrinho existe deve atualiza
                const itemExistenteIndex = carrinho.itens && Array.isArray(carrinho.itens)
                    ? carrinho.itens.findIndex(item => item.produtoId === produtoId) //ahn!?
                    : -1;

                if (carrinho.itens && itemExistenteIndex > -1) {
                    // Se o item já está no carrinho: apenas atualiza a quantidade
                    if (carrinho.itens && carrinho.itens[itemExistenteIndex]) {
                        carrinho.itens[itemExistenteIndex].quantidade += quantidade;
                    }
                } else if (carrinho.itens) {
                    // se o item não está no carrinho ele adiciona
                    carrinho.itens.push({
                        produtoId: produtoId,
                        quantidade: quantidade,
                        precoUnitario: produto.preco,
                        nome: produto.nome,
                    });
                }
                carrinho.dataAtualizacao = new Date();
            } else {
                // se não existir cria um novo carrinho
                carrinho = {
                    usuarioId: usuarioId,
                    itens: [{
                        produtoId: produtoId,
                        quantidade: quantidade,
                        precoUnitario: produto.preco,
                        nome: produto.nome,
                    }],
                    dataAtualizacao: new Date(),
                    total: 0 
                };
            }

            // calculo do total do carrinho
            carrinho.total = carrinho.itens.reduce((soma, item) => {
                return soma + (item.quantidade * item.precoUnitario);
            }, 0);

            // ssalvar o carrinho no banco de dados (Update ou Insert)
            const resultado = await db.collection('carrinhos').updateOne(
                { usuarioId: usuarioId },
                { $set: carrinho },
                { upsert: true } // opção upsert: cria se não existir, atualiza se existir
            );

            return res.status(200).json(carrinho);

        } catch (error) {
            console.error("Erro ao adicionar item ao carrinho:", error);
            // verifica se o erro é por um ObjectId inválido
            //if (error instanceof Error && error.message.includes("ahhhhhhhhhhh")) {
                // return res.status(400).json({ error: "Ops, o formato do seu produtoId está inválido, reflita!!" });
            //}
            return res.status(500).json({ error: "Ops, ocorreu um errinho no servidor, reflita!!!" });
        }
    }

    /**
     * Remove um item específico do carrinho do usuário.
     */
    async removerItem(req: Request, res: Response) {
        try {
            const { usuarioId, produtoId } = req.body;
             if (!usuarioId || !produtoId) {
                return res.status(400).json({ error: "Opss, dados inválidos: usuarioId e produtoId são obrigatórios." });
            }

            const carrinho = await db.collection('carrinhos').findOne({ usuarioId: usuarioId }) as Carrinho | null;
            if (!carrinho) {
                return res.status(404).json({ error: "Ops, seu carrinho não  foi encontrado." });
            }

            // Filtra os itens  removendo o produtoId especificado
            carrinho.itens = carrinho.itens.filter(item => item.produtoId !== produtoId);
            carrinho.dataAtualizacao = new Date();
            
            // recalcula o total
            carrinho.total = carrinho.itens.reduce((soma, item) => soma + (item.quantidade * item.precoUnitario), 0);
            
            // Atualiza o carrinho no banco de dados
            await db.collection('carrinhos').updateOne({ usuarioId: usuarioId }, { $set: carrinho });
            return res.status(200).json(carrinho);

        } catch (error) {
            console.error("Erro ao remover item do carrinho:", error);
            return res.status(500).json({ error: "Ops, ocorreu um errinho no servidor, reflita!!!" });
        }
    }

    /**
     * Atualiza a quantidade de um item específico no carrinho.
     * Se a quantidade for 0 ou menor o item é removido.
     */
    async atualizarQuantidade(req: Request, res: Response) {
        try {
            const { usuarioId, produtoId, quantidade } = req.body;
             
            if (!usuarioId || !produtoId || quantidade === undefined) {
                return res.status(400).json({ error: "Dados inválidos: usuarioId, produtoId e quantidade são obrigatórios." });
            }
            
            const carrinho = await db.collection('carrinhos').findOne({ usuarioId: usuarioId }) as Carrinho | null;
            if (!carrinho) {
                return res.status(404).json({ error: "Ops, esse carrinho não encontrado :(" });
            }

            const itemIndex = carrinho.itens.findIndex(item => item.produtoId === produtoId);
            if (itemIndex === -1) {
                return res.status(404).json({ error: "Ops, item não encontrado no carrinho :(" });
            }

            if (quantidade > 0) {
                // Atualiza a quantidade se for maior que 0
                if (carrinho.itens && carrinho.itens[itemIndex]) {
                    carrinho.itens[itemIndex].quantidade = quantidade;
                }
            } else {
                // Remove o item se a quantidade for 0 ou menor
                if (carrinho.itens) {
                    carrinho.itens.splice(itemIndex, 1);
                }
            }

            carrinho.dataAtualizacao = new Date();
            carrinho.total = carrinho.itens.reduce((soma, item) => soma + (item.quantidade * item.precoUnitario), 0);

            await db.collection('carrinhos').updateOne({ usuarioId: usuarioId }, { $set: carrinho });

            return res.status(200).json(carrinho);

        } catch (error) {
             console.error("Erro ao atualizar quantidade do item:", error);
            return res.status(500).json({ error: "Ops, ocorreu um errinho no servidor, reflita!!!" });
        }
    }

    /**
     * Lista o conteúdo do carrinho para um usuário específico.
     */
    async listar(req: Request, res: Response) {
        try {
            const { usuarioId } = req.params; // Pega o id da URL
            const carrinho = await db.collection('carrinhos').findOne({ usuarioId: usuarioId });

            if (!carrinho) {
                return res.status(404).json({ error: "Ops, Carrinho não encontrado para este usuário." });
            }

            return res.status(200).json(carrinho);
        } catch (error) {
            console.error("Erro ao listar carrinho:", error);
            return res.status(500).json({ error: "Ops, ocorreu um errinho no servidor, reflita!!!" });
        }
    }

    /**
     * Remove completamente o carrinho de um usuário.
     */
    async remover(req: Request, res: Response) {
        try {
            const { usuarioId } = req.params;
            const resultado = await db.collection('carrinhos').deleteOne({ usuarioId: usuarioId });

            if (resultado.deletedCount === 0) {
                 return res.status(404).json({ error: "opa né, para excluir um Carrinho ele deve existir, não acha!?." });
            }

            // Retorna 204 No Content, um padrão para sucesso em operações de delete sem retorno de conteúdo.
            return res.status(204).send();

        } catch (error) {
            console.error("Erro ao remover carrinho:", error);
            return res.status(500).json({ error: "Ops, ocorreu um errinho no servidor, reflita!!!" });
        }
    }
}

export default new CarrinhoController();
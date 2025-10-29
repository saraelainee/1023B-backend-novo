import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from "express";

// Interface atualizada para incluir 'role'
interface AutenticacaoRequest extends Request {
    usuarioId?: string;
    role?: string; // ADICIONADO
}

// Função 'Auth' delas, modificada para pegar o 'role'
function Auth(req: AutenticacaoRequest, res: Response, next: NextFunction) {
    const authHeaders = req.headers.authorization
    if (!authHeaders)
        return res.status(401).json({ mensagem: "Token (Bearer) não fornecido" })
    
    const token = authHeaders.split(" ")[1]
    if (!token)
        return res.status(401).json({ mensagem: "Token mal formatado" })

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { usuarioId: string, role: string }; 
        
        if (!decoded || !decoded.usuarioId) {
             return res.status(401).json({ mensagem: "Token inválido ou expirado" });
        }

        req.usuarioId = decoded.usuarioId;
        req.role = decoded.role; 
        next();

    } catch (err) {
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
    }
}

//Função de autorização
const authorizeRoles = (...roles: string[]) => {
    return (req: AutenticacaoRequest, res: Response, next: NextFunction) => {
        if (!req.role || !roles.includes(req.role)) {
            return res.status(403).json({
                success: false,
                message: "Acesso negado. Você não tem permissão para este recurso."
            });
        }
        next();
    };
};


// Exporta os valores
export { Auth, authorizeRoles };
// Exporta o tipo separadamente
export type { AutenticacaoRequest };


export default Auth;
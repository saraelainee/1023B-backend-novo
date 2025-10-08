import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
interface AutenticacaoRequest extends Request{
    usuarioId?:string;
}

//Meu primeiro middleware - que bloqueia tudo
function Auth(req: AutenticacaoRequest, res: Response, next: NextFunction){
    console.log("Cheguei no middleware e bloqueei")
    const authHeaders= req.headers.authorization
    console.log(authHeaders)
    if(!authHeaders) return res.status(401).json({mensagem: "Você não passou o token no Bearer"})

    const token = authHeaders.split("")[1]!

    jwt.verify(token,process.env.JWT_SECRET!, (err, decoded)=>{
        if(err) {
            console.log(err);
            return res.status(401).json({mensagem: "Token inválido"})
        }  
        
        if(typeof decoded === "string" || !decoded || !("usuarioId" in decoded)) {
            return res.status(401).json({mensagem: "Token inválido"})
        }

        req.usuarioId = decoded.usuarioId;
        next();
    })
}

export default Auth;
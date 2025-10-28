class BaseUser {
    protected nome: string;
    protected email: string;
    protected password: string;
    protected createdAt: string;
    protected role: string;
    
    constructor(nome: string, email: string, password: string, role: string = 'user') {
        this.nome = nome;
        this.email = email;
        this.password = password;
        this.role = role;
        this.createdAt = new Date().toISOString();
    }

    public getNome(): string {
        return this.nome;
    }

    public getEmail(): string {
        return this.email;
    }

    public getPassword(): string {
        return this.password;
    }

    public getCreatedAt(): string {
        return this.createdAt;
    }

    public getRole(): string {
        return this.role;
    }
}

class User extends BaseUser {
    constructor(nome: string, email: string, password: string) {
        super(nome, email, password, 'user');
    }
}

class AdminUser extends BaseUser {
    constructor(nome: string, email: string, password: string) {
        super(nome, email, password, 'admin');
    }
}

export { User, AdminUser };

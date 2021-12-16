export interface Auth {
    auth_idx?: number;
    access_key?: string;
    is_admin?: boolean;
    created_at?: number|string|null;
    expires?: Array<AuthRemoteExpires>;
}

export interface AuthRemoteExpires {
    expire_idx?: number;
    auth_idx?: number;
    remote_addr?: string;
    is_regexp?: boolean;
    enable_at?: number|string|null;
    expire_at?: number|string|null;
}

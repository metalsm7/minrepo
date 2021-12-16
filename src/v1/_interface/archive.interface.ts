export interface ArchiveInfo {
    group_id: string;
    artifact_id: string;
    version: string;
}

export interface ArchiveRepo {
    repo_id?: number;
    group_id?: string;
    artifact_id?: string;
    latest_version?: string;
    created_at?: number|string;
    updated_at?: number|string;
};

export interface ArchiveRepoDetail {
    repo_detail_id?: number;
    repo_id?: number;
    version?: string;
    file_path?: string;
    file_ext?: string;
    is_release?: number|boolean;
    created_at?: number|string;
};
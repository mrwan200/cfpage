export interface INewDeployment {
    manifest: Record<string, string>;
    branch?: string;
    commit_message?: string;
    commit_hash?: string;
}

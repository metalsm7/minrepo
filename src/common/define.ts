export class RegExps {
    static DateFormat14: RegExp = /^(\d{4})-(\d{2})-(\d{2})\s{1}(\d{2}):(\d{2}):(\d{2})/;
    static DateFormat14s: RegExp = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/;
    // static ReqArchive: RegExp = /^\/v\d+\/[a-zA-Z0-9]+\/archive\/(.+)\/(.+)\/(\d+\.\d+\.[^\/.]+)\/?(.+)?$/;
    static ReqArchive: RegExp = /^\/v\d+\/[a-zA-Z0-9]+\/archive\/(.+)\/(.+)\/(.+)\/?(.+)?$/;
    static Version: RegExp = /^((\d+\.\d+\.\d|\w)+(-.+)?)$/;
};
import { Response } from 'express';

export interface ApiResCode {
    code: string;
    status: number;
    desc?: string;
}
export class ApiRes {
    static Code: Record<number, ApiResCode> = {
        0x000000: { status: 200, code: '0x000000'}, // OK
    
        // 인증
        0xA00001: { status: 403, code: '0xA00001', }, // 인증오류, access_key 없음
        0xA00011: { status: 403, code: '0xA00011', }, // 인증오류, access_key 비인가
        0xA00012: { status: 403, code: '0xA00012', }, // 인증오류, access_key 만료
    };

    static send(res: Response, code: number, custom_status?: number): void {
        const res_code: ApiResCode = ApiRes.Code[code];
        res
            .status(typeof custom_status !== 'undefined' ? custom_status : res_code.status)
            .send({code: res_code.code});
    }
}

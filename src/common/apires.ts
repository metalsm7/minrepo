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

        // 일반
        0x000001: { status: 400, code: '0x000001', }, // 잘못된 요청값
        0x000011: { status: 404, code: '0x000011', }, // 대상 자료없음
        0x000012: { status: 400, code: '0x000012', }, // 일치하는 대상 존재함
        0x000021: { status: 404, code: '0x000021', }, // 요청 대상에 대해 일부 실패함
        0x000022: { status: 404, code: '0x000022', }, // 요청 대상에 대해 모두 실패함

        // 저장소
        0x100001: { status: 404, code: '0x100001', }, // 저장소 자료 없음
        0x100002: { status: 404, code: '0x100002', }, // 저장소 있음 & 파일 없음
        0x100011: { status: 409, code: '0x100011', }, // 동일 버전이 존재함
    };

    static send(res: Response, code: number, custom_status?: number): void {
        const res_code: ApiResCode = ApiRes.Code[code];
        res
            .status(typeof custom_status !== 'undefined' ? custom_status : res_code.status)
            .send({code: res_code.code});
    }
}

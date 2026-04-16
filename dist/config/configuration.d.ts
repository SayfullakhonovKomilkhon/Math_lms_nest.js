declare const _default: () => {
    nodeEnv: string;
    port: number;
    database: {
        url: string | undefined;
    };
    jwt: {
        accessSecret: string;
        refreshSecret: string;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    redis: {
        host: string;
        port: number;
    };
    s3: {
        endpoint: string;
        bucket: string;
        accessKey: string;
        secretKey: string;
        region: string;
    };
};
export default _default;

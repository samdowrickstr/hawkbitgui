import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    interface User {
        tenant: string;
        username: string;
        permissions: string[];
        hawkbitAuth: string;
    }

    interface Session {
        user: {
            tenant: string;
            username: string;
            permissions: string[];
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        tenant: string;
        username: string;
        permissions: string[];
        hawkbitAuth: string;
    }
}

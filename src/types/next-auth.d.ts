import 'next-auth';
import 'next-auth/jwt';
import type { GuiRole } from '@/utils/gui-roles';

declare module 'next-auth' {
    interface User {
        tenant: string;
        username: string;
        role: GuiRole;
        permissions: string[];
        hawkbitAuth: string;
    }

    interface Session {
        user: {
            tenant: string;
            username: string;
            role: GuiRole;
            permissions: string[];
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        tenant: string;
        username: string;
        role: GuiRole;
        permissions: string[];
        hawkbitAuth: string;
    }
}

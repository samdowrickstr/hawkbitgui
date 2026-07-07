import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authenticateGuiUser } from '@/lib/admin-users';
import { getHawkbitAuthForRole } from '@/lib/hawkbit-role-auth';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username ?? '';
        const password = credentials?.password ?? '';
        const user = await authenticateGuiUser(username, password);

        if (!user) {
          console.error('Authentication failed');
          return null;
        }

        return {
          id: user.id,
          tenant: 'DEFAULT',
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          hawkbitAuth: getHawkbitAuthForRole(user.role),
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 3600, // 1 hour
    updateAge: 300, // 5 minutes
  },
  jwt: {
    maxAge: 3600, // 1 hour
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenant = user.tenant;
        token.username = user.username;
        token.role = user.role;
        token.permissions = user.permissions;
        token.hawkbitAuth = user.hawkbitAuth;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.tenant = token.tenant;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

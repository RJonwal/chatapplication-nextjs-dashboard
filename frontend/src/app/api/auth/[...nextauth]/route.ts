  import NextAuth from "next-auth"
  import Google from "next-auth/providers/google"
  import GitHub from "next-auth/providers/github"

  const handler = NextAuth({
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
      GitHub({
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      }),
    ],
      callbacks: {
    async session({ session, token }) {
      // Add provider to session
      session.user.provider = token.provider;
      session.user.id = token.sub;
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider; // google or github
      }
      return token;
    },
  },
    secret: process.env.NEXTAUTH_SECRET,
  })

  export { handler as GET, handler as POST }


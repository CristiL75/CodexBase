import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";
import passport from "passport";
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          return done(null, existingUser);
        }

        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0].value,
          name: profile.displayName,
          avatar: profile.photos?.[0].value,
          authMethod: "google",
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

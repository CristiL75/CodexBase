import passport from "passport";
import "./google"; // importă strategia Google

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: string, done) => {
  done(null, { id } as any); // putem schimba mai târziu dacă vrei sesiune completă
});

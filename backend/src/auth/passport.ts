import passport from "passport";
import "./google"; // importă strategia Google

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  done(null, id); // putem schimba mai târziu dacă vrei sesiune completă
});

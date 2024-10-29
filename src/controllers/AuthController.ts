import type { Request, Response } from "express";
import User from "../models/User";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import Token from "../models/Token";
import { AuthEmail } from "../emails/AuthEmail";

export class AuthController {
  static createAccount = async (req: Request, res: Response) => {
    try {
      const { password, email } = req.body;

      // Prevent duplicates
      const userExists = await User.findOne({ email });
      if (userExists) {
        const error = new Error("El Usuario ya está registrado.");
        return res.status(409).json({ error: error.message });
      }

      //   Create user
      const user = new User(req.body);

      //   Hash password
      user.password = await hashPassword(password);

      // Generate Token
      const token = new Token();
      token.token = generateToken();
      token.user = user.id;

      // Send email
      AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      await Promise.allSettled([user.save(), token.save()]);

      res.send("Cuenta creada, revisa tu correo para confirmarla.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static confirmAccount = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const tokenExists = await Token.findOne({ token });
      if (!tokenExists) {
        const error = new Error("Token no válido");
        return res.status(404).json({ error: error.message });
      }

      const user = await User.findById(tokenExists.user);
      user.confirmed = true;

      await Promise.allSettled([user.save(), tokenExists.deleteOne()]);
      res.send("Cuenta confirmada correctamente.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error("Usuario no encontrado.");
        return res.status(404).json({ error: error.message });
      }

      if (!user.confirmed) {
        const token = new Token();
        token.user = user.id;
        token.token = generateToken();
        await token.save();

        // Send email
        AuthEmail.sendConfirmationEmail({
          email: user.email,
          name: user.name,
          token: token.token,
        });

        const error = new Error(
          "La cuenta no ha sido confirmada, hemos enviado un correo electrónico de confirmación."
        );
        return res.status(401).json({ error: error.message });
      }

      // Check password
      const isPasswordCorrect = await checkPassword(password, user.password);
      if (!isPasswordCorrect) {
        const error = new Error("Credenciales incorrectas.");
        return res.status(401).json({ error: error.message });
      }

      res.send("Usuario autenticado con éxito.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static requestConfirmationCode = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // User exists
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error("El Usuario no está registrado.");
        return res.status(404).json({ error: error.message });
      }

      if (user.confirmed) {
        const error = new Error("El Usuario ya está confirmado.");
        return res.status(403).json({ error: error.message });
      }

      // Generate Token
      const token = new Token();
      token.token = generateToken();
      token.user = user.id;

      // Send email
      AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      await Promise.allSettled([user.save(), token.save()]);

      res.send("Se envió un nuevo token a tu correo electrónico.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };
}

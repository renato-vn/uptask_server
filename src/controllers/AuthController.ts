import type { Request, Response } from "express";
import User from "../models/User";
import { checkPassword, hashPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import Token from "../models/Token";
import { AuthEmail } from "../emails/AuthEmail";
import { generateJWT } from "../utils/jwt";

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

      res.send("Cuenta creada, inicia sesión.");
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
        const error = new Error("Credenciales incorrectas.");
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

      const token = generateJWT({ id: user._id });

      res.send(token);
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

  static forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // User exists
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error("El Usuario no está registrado.");
        return res.status(404).json({ error: error.message });
      }

      // Generate Token
      const token = new Token();
      token.token = generateToken();
      token.user = user.id;
      await token.save();

      // Send email
      AuthEmail.sendPasswordResetToken({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      res.send("Revisa tu correo electrónico para seguir instrucciones.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static validateToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const tokenExists = await Token.findOne({ token });
      if (!tokenExists) {
        const error = new Error("Token no válido");
        return res.status(404).json({ error: error.message });
      }

      res.send("Token válido, define tu nueva contraseña.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static updatePasswordWithToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const tokenExists = await Token.findOne({ token });
      if (!tokenExists) {
        const error = new Error("Token no válido");
        return res.status(404).json({ error: error.message });
      }

      const user = await User.findById(tokenExists.user);
      user.password = await hashPassword(password);

      await Promise.allSettled([user.save(), tokenExists.deleteOne()]);

      res.send("La contraseña se modificó correctamente.");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error." });
    }
  };

  static user = async (req: Request, res: Response) => {
    return res.json(req.user);
  };

  static updateProfile = async (req: Request, res: Response) => {
    const { name, email } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists && userExists._id.toString() !== req.user._id.toString()) {
      const error = new Error("El email ingresado ya se encuentra registrado.");
      return res.status(409).json({ error: error.message });
    }

    req.user.name = name;
    req.user.email = email;

    try {
      await req.user.save();
      res.send("Perfil actualizado correctamente.");
    } catch (error) {
      res.status(500).send("Hubo un error.");
    }
  };

  static updateCurrentUserPassword = async (req: Request, res: Response) => {
    const { current_password, password } = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await checkPassword(
      current_password,
      user.password
    );

    if (!isPasswordCorrect) {
      const error = new Error("La contraseña actual es incorrecta.");
      return res.status(401).json({ error: error.message });
    }

    try {
      user.password = await hashPassword(password);
      await user.save();
      res.send("La contraseña ha sido actualizada correctamente.");
    } catch (error) {
      res.status(500).send("Hubo un error.");
    }
  };

  static checkPassword = async (req: Request, res: Response) => {
    const { password } = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await checkPassword(password, user.password);

    if (!isPasswordCorrect) {
      const error = new Error("La contraseña es incorrecta.");
      return res.status(401).json({ error: error.message });
    }

    res.send("Contraseña correcta.");
  };
}

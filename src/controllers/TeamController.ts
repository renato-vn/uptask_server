import type { Request, Response } from "express";
import User from "../models/User";
import Project from "../models/Project";

export class TeamMemberController {
  static findMemberByEmail = async (req: Request, res: Response) => {
    const { email } = req.body;

    // Find User
    const user = await User.findOne({ email }).select("id email name");

    if (!user) {
      const error = new Error("Usuario no encontrado.");
      return res.status(404).json({ error: error.message });
    }

    return res.json(user);
  };

  static getProjectTeam = async (req: Request, res: Response) => {
    const project = await Project.findById(req.project.id).populate({
      path: "team",
      select: "id email name",
    });

    return res.json(project.team);
  };

  static addMemberById = async (req: Request, res: Response) => {
    const { id } = req.body;

    // Find User
    const user = await User.findById(id).select("id");

    if (!user) {
      const error = new Error("Usuario no encontrado.");
      return res.status(404).json({ error: error.message });
    }

    if (
      req.project.team.some((team) => team.toString() === user._id.toString())
    ) {
      const error = new Error("Este miembro ya existe en el proyecto.");
      return res.status(404).json({ error: error.message });
    }

    req.project.team.push(user._id);
    await req.project.save();

    return res.send("Miembro agregado correctamente.");
  };

  static removeMemberById = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!req.project.team.some((team) => team.toString() === userId)) {
      const error = new Error("Este miembro no existe en el proyecto.");
      return res.status(404).json({ error: error.message });
    }

    req.project.team = req.project.team.filter(
      (teamMember) => teamMember.toString() !== userId
    );

    await req.project.save();

    return res.send("Miembro eliminado del proyecto correctamente.");
  };
}

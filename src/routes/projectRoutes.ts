import { Router } from "express";
import { body, param } from "express-validator";
import { ProjectController } from "../controllers/ProjectController";
import { handleInputErrors } from "../middlewares/validation";
import { TaskController } from "../controllers/TaskController";
import { projectExists } from "../middlewares/project";
import {
  hasAuthorization,
  taskBelongsToProject,
  taskExists,
} from "../middlewares/task";
import { authenticate } from "../middlewares/auth";
import { TeamMemberController } from "../controllers/TeamController";
const router = Router();

router.use(authenticate);

router.post(
  "/",
  body("projectName")
    .notEmpty()
    .withMessage("El nombre del proyecto es obligatorio."),
  body("clientName")
    .notEmpty()
    .withMessage("El nombre del cliente es obligatorio."),
  body("description")
    .notEmpty()
    .withMessage("La descripción del proyecto es obligatoria."),
  handleInputErrors,
  ProjectController.createProject
);

router.get("/", ProjectController.getAllProjects);

router.get(
  "/:id",
  param("id").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  ProjectController.getProjectById
);

router.put(
  "/:id",
  param("id").isMongoId().withMessage("ID no válido."),
  body("projectName")
    .notEmpty()
    .withMessage("El nombre del proyecto es obligatorio."),
  body("clientName")
    .notEmpty()
    .withMessage("El nombre del cliente es obligatorio."),
  body("description")
    .notEmpty()
    .withMessage("La descripción del proyecto es obligatoria."),
  handleInputErrors,
  ProjectController.updateProject
);

router.delete(
  "/:id",
  param("id").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  ProjectController.deleteProject
);

/* Routes for tasks */
router.param("projectId", projectExists);

router.post(
  "/:projectId/tasks",
  hasAuthorization,
  body("name").notEmpty().withMessage("El nombre de la tarea es obligatoria."),
  body("description")
    .notEmpty()
    .withMessage("La descripción de la tarea es obligatoria."),
  handleInputErrors,
  TaskController.createTask
);

router.get("/:projectId/tasks", TaskController.getProjectTasks);

router.param("taskId", taskExists);
router.param("taskId", taskBelongsToProject);

router.get(
  "/:projectId/tasks/:taskId",
  param("taskId").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  TaskController.getTaskById
);

router.put(
  "/:projectId/tasks/:taskId",
  hasAuthorization,
  param("taskId").isMongoId().withMessage("ID no válido."),
  body("name").notEmpty().withMessage("El nombre de la tarea es obligatoria."),
  body("description")
    .notEmpty()
    .withMessage("La descripción de la tarea es obligatoria."),
  handleInputErrors,
  TaskController.updateTask
);

router.delete(
  "/:projectId/tasks/:taskId",
  hasAuthorization,
  param("taskId").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  TaskController.deleteTask
);

router.post(
  "/:projectId/tasks/:taskId/status",
  param("taskId").isMongoId().withMessage("ID no válido."),
  body("status").notEmpty().withMessage("El estado es obligatorio."),
  handleInputErrors,
  TaskController.updateTaskStatus
);

// Routes for teams
router.post(
  "/:projectId/team/find",
  body("email")
    .isEmail()
    .toLowerCase()
    .withMessage("Correo electrónico no válido."),
  handleInputErrors,
  TeamMemberController.findMemberByEmail
);

router.get("/:projectId/team", TeamMemberController.getProjectTeam);

router.post(
  "/:projectId/team",
  body("id").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  TeamMemberController.addMemberById
);

router.delete(
  "/:projectId/team/:userId",
  param("userId").isMongoId().withMessage("ID no válido."),
  handleInputErrors,
  TeamMemberController.removeMemberById
);

export default router;

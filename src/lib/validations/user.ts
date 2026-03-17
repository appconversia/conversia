import { z } from "zod";

const ROLE_OPTIONS = ["admin", "colaborador"] as const;

export const createUserSchema = z
  .object({
    name: z.string().min(1, "El nombre completo es requerido"),
    email: z.string().email("Email inválido"),
    phone: z.string().optional().default(""),
    role: z.enum(ROLE_OPTIONS, { required_error: "Selecciona un rol" }),
    password: z.string().min(6, "Mínimo 6 caracteres"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirm"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

const ROLE_OPTIONS_EDIT = ["admin", "colaborador"] as const;

export const updateUserSchema = z.object({
  name: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional().default(""),
  role: z.enum(ROLE_OPTIONS_EDIT, { required_error: "Selecciona un rol" }),
  password: z.string().optional(),
  passwordConfirm: z.string().optional(),
}).refine(
  (data) => !data.password || data.password.length === 0 || data.password.length >= 6,
  { message: "Mínimo 6 caracteres", path: ["password"] }
).refine(
  (data) => !data.password || !data.passwordConfirm || data.password === data.passwordConfirm,
  { message: "Las contraseñas no coinciden", path: ["passwordConfirm"] }
);

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email inválido")
    .transform((s) => s.trim().toLowerCase()),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  name: z.string().min(1, "Indica tu nombre"),
  organizationName: z
    .string()
    .min(2, "Indica el nombre de tu organización o negocio")
    .max(120),
});

/** Valores del formulario (antes del transform del email). */
export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

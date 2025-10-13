import { z } from "zod";
export const UserValidator = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export const ClerkCreateUserValidator = z
    .object({
    data: z.object({
        first_name: z.string(),
        last_name: z.string(),
        email_addresses: z
            .array(z.object({
            email_address: z.string().email(),
        }))
            .min(1),
        created_at: z.number(),
        id: z.string(),
        image_url: z.string().url().optional(),
    }),
    timestamp: z.number(),
    type: z.literal("user.created"),
})
    .transform((data) => ({
    name: `${data.data.first_name} ${data.data.last_name}`,
    email: data.data.email_addresses[0].email_address,
    created_at: data.data.created_at,
    id: data.data.id,
    profile_image_url: data.data.image_url || "",
}));

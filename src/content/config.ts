import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const events = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    endDate: z.date().optional(),
    location: z.string(),
    image: z.string().optional(),
    photos: z.array(z.string()).optional(),
    isPast: z.boolean().default(false),
  }),
});

export const collections = {
  articles,
  events,
};

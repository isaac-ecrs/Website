import { defineCollection, z } from 'astro:content';

const eventsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    location: z.object({
      venue: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
    }),
    image: z.string().optional(),
    cost: z.string(),
    registrationEmail: z.string().email(),
    featured: z.boolean().default(false),
  }),
});

const pagesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    hero: z.object({
      title: z.string(),
      subtitle: z.string(),
      backgroundImage: z.string(),
      ctaText: z.string(),
      ctaLink: z.string(),
    }),
    featureCards: z.array(
      z.object({
        title: z.string(),
        icon: z.string(),
        description: z.string(),
      })
    ),
    about: z.string(),
    whatWeDo: z.object({
      image: z.string(),
      description: z.string(),
      activities: z.string(),
    }),
  }),
});

export const collections = {
  events: eventsCollection,
  pages: pagesCollection,
};

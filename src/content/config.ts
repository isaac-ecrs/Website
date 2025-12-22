import { defineCollection, z, reference } from 'astro:content';

const leadersCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    bio: z.string(),
    image: z.string().optional(),
    location: z.string().optional(),
  }),
});

const classesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    leader: reference('leaders'),
    descriptions: z.array(
      z.object({
        year: z.number(),
        content: z.string(),
      })
    ),
  }),
});

const eventsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    eventSlug: z.string().regex(/^[a-z0-9-]+-\d{4}$/),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    location: z.object({
      venue: z.string(),
      address: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      website: z.string().url().optional(),
    }),
    image: z.string().optional(),
    cost: z.string(),
    registrationEmail: z.string().email(),
    shortDescription: z.string().nullish(),
    // Extended fields for detailed event pages
    venueDescription: z.string().optional(),
    venuePhone: z.string().optional(),
    highlights: z
      .array(
        z.object({
          title: z.string(),
          icon: z.string().optional(),
          description: z.string(),
        })
      )
      .optional(),
    accommodation: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          rates: z.array(
            z.object({
              occupancy: z.string(),
              adult: z.string(),
              child: z.string().optional(),
            })
          ),
        })
      )
      .optional(),
    schedule: z
      .object({
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        daily: z
          .array(
            z.object({
              time: z.string(),
              activity: z.string(),
            })
          )
          .optional(),
        notes: z.string().optional(),
      })
      .optional(),
    tuition: z
      .object({
        adult: z.string(),
        child: z.string().optional(),
        notes: z.array(z.string()).optional(),
      })
      .optional(),
    deadlines: z
      .array(
        z.object({
          date: z.string(),
          description: z.string(),
        })
      )
      .optional(),
    policies: z
      .array(
        z.object({
          title: z.string(),
          content: z.string(),
        })
      )
      .optional(),
    ageNotes: z.string().optional(),
    classPeriods: z
      .array(
        z.object({
          period: z.string(),
          offerings: z.array(
            z.object({
              class: z.string(),
              descriptionYear: z.number().optional(),
              days: z.string().optional(),
              age: z.string().optional(),
              note: z.string().optional(),
            })
          ),
        })
      )
      .optional(),
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

const navigationCollection = defineCollection({
  type: 'data',
  schema: z.object({
    items: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        isButton: z.boolean().default(false),
      })
    ),
  }),
});

export const collections = {
  events: eventsCollection,
  pages: pagesCollection,
  navigation: navigationCollection,
  leaders: leadersCollection,
  classes: classesCollection,
};

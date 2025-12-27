/**
 * Content Collection Schemas
 *
 * WHY ZOD SCHEMAS?
 * Zod validates content at build time. If a markdown file is missing a required
 * field or has the wrong type, the build fails with a clear error. This catches
 * content mistakes before they reach production.
 *
 * WHY DISCRIMINATED UNIONS FOR PAGES?
 * Each page type (home, about, contact, etc.) has different content needs.
 * Using z.discriminatedUnion() on pageType means:
 *
 * 1. TypeScript knows exactly which fields exist after checking pageType:
 *    if (page.data.pageType === 'contact') {
 *      // TS now knows page.data.contacts exists
 *    }
 *
 * 2. The CMS shows only relevant fields for each page type
 *
 * 3. Build-time validation ensures each page type has its required fields
 *
 * WHY SHARED SCHEMAS (heroSchema, featureCardSchema, etc.)?
 * Many page types share common structures. Defining these once ensures
 * consistency and makes updates easier - change heroSchema and all pages
 * using it get the update.
 */
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
    heroImage: z.string().optional(),
    bodyImage: z.string().optional(),
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

// Hero schema used by all pages
const heroSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  backgroundImage: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
});

// Feature card schema
const featureCardSchema = z.object({
  title: z.string(),
  icon: z.string().optional(),
  image: z.string().optional(),
  description: z.string(),
  link: z.string().optional(),
  linkText: z.string().optional(),
});

// Activity item schema
const activitySchema = z.object({
  title: z.string(),
  icon: z.string().optional(),
  description: z.string(),
});

// Sub-page link card schema
const subPageCardSchema = z.object({
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  link: z.string(),
  linkText: z.string().optional(),
});

// Principle card schema (for What Makes ECRS Special)
const principleSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});

// Membership benefit schema
const benefitSchema = z.object({
  title: z.string(),
  description: z.string(),
  icon: z.string().optional(),
});

// Membership pricing tier schema
const pricingTierSchema = z.object({
  name: z.string(),
  price: z.string(),
  duration: z.string(),
  description: z.string().optional(),
  highlighted: z.boolean().optional(),
});

// Contact person schema
const contactSchema = z.object({
  name: z.string(),
  region: z.string(),
  phone: z.string(),
  email: z.string().optional(),
});

// Resource link schema
const resourceLinkSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
});

// Resource section schema
const resourceSectionSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  links: z.array(resourceLinkSchema).optional(),
  content: z.string().optional(),
});

// History section schema
const historySectionSchema = z.object({
  title: z.string(),
  content: z.string(),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
});

// Pages collection with discriminated union by pageType
const pagesCollection = defineCollection({
  type: 'content',
  schema: z.discriminatedUnion('pageType', [
    // Home page schema (existing)
    z.object({
      pageType: z.literal('home'),
      title: z.string(),
      hero: heroSchema,
      featureCards: z.array(featureCardSchema),
      about: z.string(),
      whatWeDo: z.object({
        image: z.string(),
        description: z.string(),
        activities: z.string(),
      }),
    }),
    // About page schema
    z.object({
      pageType: z.literal('about'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      philosophy: z.string().optional(),
      guidingPrinciples: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
          })
        )
        .optional(),
      activities: z.array(activitySchema).optional(),
      additionalOfferings: z.array(z.string()).optional(),
      typicalProgramming: z.array(z.string()).optional(),
      subPages: z.array(subPageCardSchema).optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
    }),
    // History page schema
    z.object({
      pageType: z.literal('history'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      nameExplanation: z.string().optional(),
      sections: z.array(historySectionSchema).optional(),
    }),
    // Special page schema (What Makes ECRS Special)
    z.object({
      pageType: z.literal('special'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      principles: z.array(principleSchema),
      ctaTitle: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
      ctaButtonText: z.string().optional(),
    }),
    // Resources page schema
    z.object({
      pageType: z.literal('resources'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string().optional(),
      sections: z.array(resourceSectionSchema),
    }),
    // Membership page schema
    z.object({
      pageType: z.literal('membership'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      benefits: z.array(benefitSchema),
      pricingIntro: z.string().optional(),
      pricingTiers: z.array(pricingTierSchema),
      formPlaceholderId: z.string().optional(),
      tagline: z.string().optional(),
    }),
    // Contact page schema
    z.object({
      pageType: z.literal('contact'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      formPlaceholderId: z.string().optional(),
      contactsTitle: z.string().optional(),
      contacts: z.array(contactSchema),
    }),
    // Donate page schema
    z.object({
      pageType: z.literal('donate'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string(),
      taxInfo: z.string().optional(),
      formPlaceholderId: z.string().optional(),
    }),
    // Testimonials page schema
    z.object({
      pageType: z.literal('testimonials'),
      title: z.string(),
      hero: heroSchema,
      intro: z.string().optional(),
      testimonials: z.array(
        z.object({
          quote: z.string(),
          author: z.string().optional(),
          role: z.string().optional(),
        })
      ),
    }),
  ]),
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

// Site settings collection (footer, global content)
const settingsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    organizationName: z.string(),
    tagline: z.string(),
    footer: z.object({
      aboutText: z.string(),
      copyrightText: z.string(),
      columns: z.array(
        z.object({
          title: z.string(),
          links: z.array(
            z.object({
              label: z.string(),
              href: z.string(),
            })
          ),
        })
      ),
      contactText: z.string(),
      contactLink: z.string(),
    }),
  }),
});

export const collections = {
  events: eventsCollection,
  pages: pagesCollection,
  navigation: navigationCollection,
  settings: settingsCollection,
  leaders: leadersCollection,
  classes: classesCollection,
};

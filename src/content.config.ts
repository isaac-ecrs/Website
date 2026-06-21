import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const metadataDefinition = () =>
  z
    .object({
      title: z.string().optional(),
      ignoreTitleTemplate: z.boolean().optional(),

      canonical: z.url().optional(),

      robots: z
        .object({
          index: z.boolean().optional(),
          follow: z.boolean().optional(),
        })
        .optional(),

      description: z.string().optional(),

      openGraph: z
        .object({
          url: z.string().optional(),
          siteName: z.string().optional(),
          images: z
            .array(
              z.object({
                url: z.string(),
                width: z.number().optional(),
                height: z.number().optional(),
              })
            )
            .optional(),
          locale: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),

      twitter: z
        .object({
          handle: z.string().optional(),
          site: z.string().optional(),
          cardType: z.string().optional(),
        })
        .optional(),
    })
    .optional();

const postCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/post' }),
  schema: z.object({
    publishDate: z.date().optional(),
    updateDate: z.date().optional(),
    draft: z.boolean().optional(),

    title: z.string(),
    excerpt: z.string().optional(),
    image: z.string().optional(),

    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),

    metadata: metadataDefinition(),
  }),
});

const landingSettingsCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/data/settings' }),
  schema: z.object({
    heroTagline: z.string(),
    heroTitle: z.string(),
    heroSubtitle: z.string(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    aboutTitle: z.string(),
    aboutBody: z.string(),
    aboutImage: z.string().optional(),
    pillars: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string(),
        classes: z.object({ icon: z.string() }).optional(),
      })
    ),
    stats: z
      .array(
        z.object({
          amount: z.string(),
          title: z.string(),
        })
      )
      .optional(),
  }),
});

const pricingTierSchema = z.object({
  ageRange: z.string().optional(),
  fullWeekend: z.string().optional(),
  note: z.string().optional(),
});

const accommodationTierSchema = z.object({
  label: z.string(),
  amount: z.string(),
});

const accommodationSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  tiers: z.array(accommodationTierSchema),
});

const tuitionTierSchema = z.object({
  label: z.string(),
  amount: z.string(),
  note: z.string().optional(),
});

const eventCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/events' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    endDate: z.date().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    location: z.string(),
    address: z.string().optional(),
    phone: z.string().optional(),
    accessibilityNote: z.string().optional(),
    excerpt: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),

    // Registration
    registrationUrl: z.string().optional(),
    registrationEmail: z.string().email().optional(),
    registrationDeadline: z.date().optional(),
    earlyBirdDeadline: z.date().optional(),
    earlyBirdFeeNote: z.string().optional(),
    cognitoFormId: z.string().optional(),
    cognitoFormHeight: z.string().optional(),

    // Pricing — three tiers of complexity (mutually exclusive, pick one)
    fee: z.string().optional(), // simple: "Free / $25 adults"
    tuition: z.array(tuitionTierSchema).optional(), // mid/full: tuition rows
    accommodations: z.array(accommodationSchema).optional(), // full: residential room & board
    pricing: z.array(pricingTierSchema).optional(), // legacy — kept for back-compat

    // Logistics
    mealsIncluded: z.string().optional(),
    mealsNote: z.string().optional(),

    // Policies (shown when toggled on; text editable per event)
    showCancellationPolicy: z.boolean().optional(),
    cancellationCutoffDate: z.date().optional(),
    cancellationPolicy: z.string().optional(),
    showHealthPolicy: z.boolean().optional(),
    healthPolicy: z.string().optional(),

    // Additional info
    newcomerNote: z.string().optional(),
    financialAidNote: z.string().optional(),
    leaderProfilesUrl: z.string().optional(),

    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  post: postCollection,
  event: eventCollection,
  landingSettings: landingSettingsCollection,
};

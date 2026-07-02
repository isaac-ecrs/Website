import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const emptyToUndefined = (v: unknown) => (v === '' || v == null ? undefined : v);
const optionalDate = z.preprocess(emptyToUndefined, z.date().optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

const landingSettingsCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/data/settings' }),
  schema: z.object({
    heroTitle: z.string(),
    heroSubtitle: z.string(),
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
    whatToExpectTitle: z.string().optional(),
    whatToExpectSubtitle: z.string().optional(),
    whatToExpectItems: z
      .array(
        z.object({
          title: z.string(),
          description: z.string(),
          icon: z.string(),
          iconColor: z.string().optional(),
        })
      )
      .optional(),
    whyTitle: z.string().optional(),
    whySubtitle: z.string().optional(),
    ctaTitle: z.string().optional(),
    ctaSubtitle: z.string().optional(),
    ctaPrimaryText: z.string().optional(),
    ctaPrimaryHref: z.string().optional(),
    ctaSecondaryText: z.string().optional(),
    ctaSecondaryHref: z.string().optional(),
    moreEventsEyebrow: z.string().optional(),
    moreEventsHeading: z.string().optional(),
    moreEventsViewAllText: z.string().optional(),
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
  label: z.string().optional(),
  amount: z.string(),
  note: z.string().optional(),
});

const testimonialCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/data/testimonials' }),
  schema: z.object({
    quote: z.string(),
    name: z.string().optional(),
    role: z.string().optional(),
  }),
});

const leaderCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/data/leaders' }),
  schema: z.object({
    name: z.string(),
    title: z.string().optional(),
    photo: z.string().optional(),
    bio: z.string().optional(),
  }),
});

const siteCollection = defineCollection({
  loader: glob({ pattern: '*.md', base: 'src/data/sites' }),
  schema: z.object({
    name: z.string(),
    address: z.string().optional(),
    phone: z.string().optional(),
    accessibilityNote: z.string().optional(),
    image: z.string().optional(),
  }),
});

const eventCollection = defineCollection({
  loader: glob({ pattern: ['*.md', '*.mdx'], base: 'src/data/events' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    endDate: optionalDate,
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    siteId: z.string().optional(),
    location: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    accessibilityNote: z.string().optional(),
    excerpt: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),

    // Registration
    registrationUrl: optionalString,
    registrationDeadline: optionalDate,
    earlyBirdDeadline: optionalDate,
    earlyBirdFeeNote: z.string().optional(),
    cognitoFormId: z.string().optional(),

    // Pricing — three tiers of complexity (mutually exclusive, pick one)
    fee: z.string().optional(), // simple: "Free / $25 adults"
    tuitionLabel: optionalString, // override heading; defaults to "Tuition"
    tuition: z.array(tuitionTierSchema).optional(), // mid/full: tuition rows
    accommodations: z.array(accommodationSchema).optional(), // full: residential room & board
    pricing: z.array(pricingTierSchema).optional(), // legacy — kept for back-compat

    // Logistics
    mealsIncluded: z.string().optional(),
    mealsNote: z.string().optional(),

    // Policies (shown when toggled on; text editable per event)
    showCancellationPolicy: z.boolean().optional(),
    cancellationCutoffDate: optionalDate,
    cancellationPolicy: z.string().optional(),
    showHealthPolicy: z.boolean().optional(),
    healthPolicy: z.string().optional(),

    // Classes / program
    classes: z
      .array(
        z.object({
          name: z.string(),
          leaders: z
            .array(
              z.object({
                id: z.string().optional(),
                name: z.string().optional(),
                role: z.enum(['assistant']).optional(),
              })
            )
            .optional(),
          leaderId: z.string().optional(),
          leader: z.string().optional(),
          ageRange: z.string().optional(),
          period: z.string().optional(),
          days: z.string().optional(),
          limitedCapacity: z.boolean().optional(),
          description: z.string().optional(),
          callout: z.string().optional(),
        })
      )
      .optional(),

    // Additional info
    newcomerNote: z.string().optional(),
    financialAidNote: z.string().optional(),

    tags: z.array(z.string()).optional(),

    // Internal — draft events build pages but are excluded from listings/sitemap
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  event: eventCollection,
  leader: leaderCollection,
  site: siteCollection,
  testimonial: testimonialCollection,
  landingSettings: landingSettingsCollection,
};

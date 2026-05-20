export type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover: string | null;
  author: string;
  published: boolean;
  date: string;
};

export const initialBlogs: Blog[] = [
  {
    id: "1",
    title: "5 Lighting Trends Set to Redefine Interiors in 2026",
    slug: "lighting-trends-2026",
    excerpt: "From organic minimalist fixtures to smart interactive ambient lighting, discover what's shaping modern homes this year.",
    body: `Good lighting is no longer just about visibility; it's about setting an emotional atmosphere and enhancing well-being. As we move into 2026, the trends are leaning heavily towards a blend of organic craftsmanship and highly advanced technology.

1. Organic Minimalism
Think warm, textured materials like plaster, linen, terracotta, and rattan. Geometric shapes are being softened with rounded curves and asymmetrical designs that feel handmade.

2. Interactive Color Cascades
Smart LED technology has evolved. Instead of simple color choices, lights can now shift gradually throughout the day, replicating circadian rhythms to boost energy in the morning and calm the mind at night.

3. Sculptural Statements
Floor lamps and pendant lights are acting as functional art pieces. Bold silhouettes, oversized globes, and brutalist metal structures draw the eye even when turned off.

4. Invisible Illumination
Recessed LED strips hidden in architectural coves, under shelves, and behind headboards create a clean, indirect wash of light that makes spaces feel larger and more serene.

5. Sustainable Eco-Design
Biocompatible materials, low-energy LED cores, and modular structures that allow easy bulb and component replacement are leading the push toward eco-responsible lighting solutions.`,
    cover: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
    author: "Sophie V.",
    published: true,
    date: "2026-05-10"
  },
  {
    id: "2",
    title: "How to Choose the Perfect Pendant Lamp for Your Dining Area",
    slug: "choose-pendant-lamp",
    excerpt: "Sizing, suspension heights, temperature, and stylistic choices: here is a complete guide to making the right choice.",
    body: `A pendant lamp is the centerpiece of a dining room, pulling the table, seating, and decor together. But choose the wrong size or hang it too low, and it can disrupt the room's flow. Here is how to get it right.

Rule 1: Scale & Size
A general rule of thumb is that the diameter of your pendant light should be about 1/2 to 2/3 the width of your dining table. If the lamp is too small, it will look lost; if it's too big, it will overpower the dining space.

Rule 2: Suspension Height
The bottom of the pendant light should ideally hang between 30 to 36 inches (75 to 90 cm) above the tabletop. This keeps the light source out of your eyes while ensuring you can still see the people sitting across from you.

Rule 3: Light Quality & Dimmers
Dining rooms require versatility. Use a dimmable LED bulb (warm white, around 2700K) so you can transition easily from bright lighting for kids' homework to soft, romantic ambiance for late-night dinners.

Rule 4: Matching the Shape
Pair rectangular tables with linear multi-bulb pendants, or place a row of individual pendants. For round or square tables, a single central dome or chandelier style works best to emphasize the symmetry of the space.`,
    cover: "https://images.unsplash.com/photo-1565538810844-1e119d81a207?w=800&auto=format&fit=crop&q=80",
    author: "Mark D.",
    published: true,
    date: "2026-05-18"
  },
  {
    id: "3",
    title: "Illuminating the Outdoors: A Guide to Patio & Garden Lighting",
    slug: "outdoor-lighting-guide",
    excerpt: "Turn your outdoor garden, patio, or backyard into a cozy evening oasis with layering, pathway spots, and warm accents.",
    body: `As warm evenings arrive, your garden and patio become an extension of your living room. The right outdoor lighting can make this space feel warm, inviting, and secure.

Layer 1: Ambient Lighting
Create a soft base glow using weatherproof string lights or hanging solar lanterns. Wrap warm white fairy lights around tree trunks or suspend them across the patio to create a starry-canopy effect.

Layer 2: Task Lighting
Ensure paths, stairs, and outdoor kitchens are well-lit for safety. Flush-mounted step lights and low-voltage pathway posts are perfect for guiding foot traffic without creating harsh glare.

Layer 3: Accent Spotlight
Use spike-mounted LED spotlights to highlight architectural features, large plants, or stone walls. Directing light upwards (up-lighting) onto trees creates drama and adds visual depth to your garden.

A Tip on Color Temperature:
Keep your outdoor lights warm (between 2200K and 2700K). Cold blue lights (4000K+) look unnatural in nature and can disrupt local wildlife. Warm tones create a premium, resort-like resort feel in your backyard.`,
    cover: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&auto=format&fit=crop&q=80",
    author: "Elena R.",
    published: true,
    date: "2026-05-19"
  }
];

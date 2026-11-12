import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const playbook = await prisma.cmsConfig.findUnique({
      where: { key: "ai_seo_playbook" }
    });
    console.log("SEO Playbook DB:", JSON.stringify(playbook?.value, null, 2));

    const landing = await prisma.cmsConfig.findUnique({
      where: { key: "landing_pages_data" }
    });
    
    // Just show a few landing pages to see their SEO config
    if (landing?.value) {
      const val = landing.value as Record<string, any>;
      console.log("Wall Lights SEO:", JSON.stringify(val["wall-lights"], null, 2));
      console.log("Floor Lamps SEO:", JSON.stringify(val["floor-lamps"], null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();

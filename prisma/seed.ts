import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/seed/generate";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Sunny Workplace Intelligence synthetic database (Northstar Community Services)...");
  await seedDatabase(prisma);
  const counts = {
    organizations: await prisma.organization.count(),
    teams: await prisma.team.count(),
    employees: await prisma.employee.count(),
    projects: await prisma.project.count(),
    profiles: await prisma.energyProfile.count({ where: { isCurrent: true } }),
    snapshots: await prisma.teamVitalSnapshot.count(),
    events: await prisma.organizationalEvent.count(),
    observations: await prisma.workplaceObservation.count(),
    interventions: await prisma.intervention.count(),
    executions: await prisma.interventionExecution.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

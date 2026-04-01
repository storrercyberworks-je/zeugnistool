const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding Tenants and Users...");

    // 1) Tenants
    const tenantGibb = await prisma.tenant.upsert({
        where: { code: 'hf-gibb-iet' },
        update: {},
        create: {
            name: 'HF GIBB IET',
            code: 'hf-gibb-iet'
        }
    });

    const tenantHbb = await prisma.tenant.upsert({
        where: { code: 'hbb-elektro' },
        update: {},
        create: {
            name: 'HBB Elektro',
            code: 'hbb-elektro'
        }
    });

    console.log("Tenants seeded.");

    const passwordHash = await bcrypt.hash('sml12345', 10);

    const usersToSeed = [
        {
            username: 'admin',
            role: 'admin',
            full_name: 'System Admin',
            tenants: [tenantGibb.id, tenantHbb.id]
        },
        {
            username: 'christof.hunziker',
            role: 'admin',
            full_name: 'Christof Hunziker',
            tenants: [tenantGibb.id]
        },
        {
            username: 'herbert.hoeltschel',
            role: 'admin',
            full_name: 'Herbert Höltschel',
            tenants: [tenantHbb.id]
        },
        {
            username: 'ralph.maurer',
            role: 'admin',
            full_name: 'Ralph Maurer',
            tenants: [tenantGibb.id, tenantHbb.id]
        },
        {
            username: 'dozent.test',
            role: 'dozent',
            full_name: 'Test Dozent',
            tenants: [tenantGibb.id]
        }
    ];

    for (const u of usersToSeed) {
        const user = await prisma.user.upsert({
            where: { username: u.username },
            update: {
                password_hash: passwordHash,
                role: u.role,
                full_name: u.full_name
            },
            create: {
                username: u.username,
                password_hash: passwordHash,
                role: u.role,
                full_name: u.full_name
            }
        });

        // Seed access
        for (const tid of u.tenants) {
            await prisma.userTenantAccess.upsert({
                where: {
                    user_id_tenant_id: {
                        user_id: user.id,
                        tenant_id: tid
                    }
                },
                update: {},
                create: {
                    user_id: user.id,
                    tenant_id: tid
                }
            });
        }
    }

    console.log("Users and Access seeded.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

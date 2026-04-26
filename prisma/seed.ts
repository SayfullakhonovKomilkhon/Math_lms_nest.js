import { PrismaClient, Role, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function isDatabaseUnreachable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("Can't reach database") || msg.includes('ECONNREFUSED')) {
    return true;
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    return code === 'P1001' || code === 'P1017';
  }
  return false;
}

function printDatabaseHelp(): void {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('PostgreSQL недоступен (не отвечает на подключение).');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.error('Сначала на машине должен работать сервер на хосте и порту из DATABASE_URL');
  console.error('(часто localhost:5432).\n');
  console.error('— С Docker: установите Docker Desktop, затем из папки mathcenter-backend:\n');
  console.error('   npm run db:prepare\n');
  console.error('— Без Docker (macOS): brew install postgresql@16 && brew services start postgresql@16');
  console.error('  создайте БД и пользователя, пропишите DATABASE_URL в .env, затем:\n');
  console.error('   npx prisma db push && npx prisma db seed\n');
  console.error('— Postgres.app: https://postgresapp.com/\n');
  console.error('Если команда `docker` не найдена — см. вывод `npm run db:prepare` (там подсказки).\n');
  console.error('Пример URL для docker-compose (на macOS лучше 127.0.0.1, не localhost):\n');
  console.error(
    '   postgresql://mathcenter:mathcenter@127.0.0.1:5432/mathcenter?schema=public\n',
  );
}

async function main() {
  console.log('Seeding database...');

  const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

  // Phones are used as login identifiers. Test placeholders below.
  const PHONES = {
    superAdmin: '+998000000001',
    admin: '+998000000002',
    teacher: '+998900000001',
    teacher1: '+998901111111',
    teacher2: '+998902222222',
    student: '+998900000010',
    parent: '+998900000020',
    student1: '+998901111101',
    student2: '+998901111102',
    student3: '+998901111103',
    student4: '+998901111104',
    student5: '+998901111105',
    parent1: '+998901111201',
    parent2: '+998901111202',
  };

  // Admin
  const adminHash = await hashPassword('123456');
  await prisma.user.upsert({
    where: { phone: PHONES.admin },
    update: { passwordHash: adminHash },
    create: {
      phone: PHONES.admin,
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log('Created admin:', PHONES.admin);

  // Teacher
  const teacherHash = await hashPassword('123456');
  const teacherUser = await prisma.user.upsert({
    where: { phone: PHONES.teacher },
    update: { passwordHash: teacherHash },
    create: {
      phone: PHONES.teacher,
      passwordHash: teacherHash,
      role: Role.TEACHER,
    },
  });
  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      fullName: 'Default Teacher',
      phone: PHONES.teacher,
      ratePerStudent: 50000,
    },
  });
  console.log('Created teacher:', PHONES.teacher);

  // Student
  const studentHash = await hashPassword('123456');
  const studentUser = await prisma.user.upsert({
    where: { phone: PHONES.student },
    update: { passwordHash: studentHash },
    create: {
      phone: PHONES.student,
      passwordHash: studentHash,
      role: Role.STUDENT,
    },
  });
  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      fullName: 'Default Student',
      phone: PHONES.student,
      gender: Gender.MALE,
    },
  });
  console.log('Created student:', PHONES.student);

  // Parent
  const parentHash = await hashPassword('123456');
  const parentUser = await prisma.user.upsert({
    where: { phone: PHONES.parent },
    update: { passwordHash: parentHash },
    create: {
      phone: PHONES.parent,
      passwordHash: parentHash,
      role: Role.PARENT,
    },
  });
  const defaultParent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      fullName: 'Default Parent',
      phone: PHONES.parent,
    },
  });
  await prisma.parentStudent.upsert({
    where: {
      parentId_studentId: { parentId: defaultParent.id, studentId: student.id },
    },
    update: {},
    create: { parentId: defaultParent.id, studentId: student.id },
  });
  console.log('Created parent:', PHONES.parent);

  // Super Admin
  const superAdminHash = await hashPassword('123456');
  const superAdminUser = await prisma.user.upsert({
    where: { phone: PHONES.superAdmin },
    update: { passwordHash: superAdminHash },
    create: {
      phone: PHONES.superAdmin,
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('Created super admin:', PHONES.superAdmin);

  // Teacher 1
  const teacher1Hash = await hashPassword('Teacher123!');
  const teacher1User = await prisma.user.upsert({
    where: { phone: PHONES.teacher1 },
    update: {},
    create: {
      phone: PHONES.teacher1,
      passwordHash: teacher1Hash,
      role: Role.TEACHER,
    },
  });
  const teacher1 = await prisma.teacher.upsert({
    where: { userId: teacher1User.id },
    update: {},
    create: {
      userId: teacher1User.id,
      fullName: 'Bobur Toshmatov',
      phone: PHONES.teacher1,
      ratePerStudent: 50000,
    },
  });
  console.log('Created teacher 1:', teacher1.fullName);

  // Teacher 2
  const teacher2Hash = await hashPassword('Teacher123!');
  const teacher2User = await prisma.user.upsert({
    where: { phone: PHONES.teacher2 },
    update: {},
    create: {
      phone: PHONES.teacher2,
      passwordHash: teacher2Hash,
      role: Role.TEACHER,
    },
  });
  const teacher2 = await prisma.teacher.upsert({
    where: { userId: teacher2User.id },
    update: {},
    create: {
      userId: teacher2User.id,
      fullName: 'Gulnora Rashidova',
      phone: PHONES.teacher2,
      ratePerStudent: 55000,
    },
  });
  console.log('Created teacher 2:', teacher2.fullName);

  // Groups
  const group1 = await prisma.group.upsert({
    where: { id: 'group-seed-1' },
    update: {},
    create: {
      id: 'group-seed-1',
      name: 'Algebra 9A',
      teacherId: teacher1.id,
      maxStudents: 20,
      schedule: { days: ['MONDAY', 'WEDNESDAY', 'FRIDAY'], time: '09:00', duration: 90 },
    },
  });

  const group2 = await prisma.group.upsert({
    where: { id: 'group-seed-2' },
    update: {},
    create: {
      id: 'group-seed-2',
      name: 'Geometry 10B',
      teacherId: teacher2.id,
      maxStudents: 15,
      schedule: { days: ['TUESDAY', 'THURSDAY'], time: '14:00', duration: 120 },
    },
  });

  const group3 = await prisma.group.upsert({
    where: { id: 'group-seed-3' },
    update: {},
    create: {
      id: 'group-seed-3',
      name: 'Olympiad Prep',
      teacherId: teacher1.id,
      maxStudents: 10,
      schedule: { days: ['SATURDAY'], time: '10:00', duration: 180 },
    },
  });
  console.log('Created 3 groups:', group1.name, group2.name, group3.name);

  // Students
  const studentsData = [
    { phone: PHONES.student1, fullName: 'Alisher Karimov', gender: Gender.MALE, groupId: group1.id },
    { phone: PHONES.student2, fullName: 'Malika Yusupova', gender: Gender.FEMALE, groupId: group1.id },
    { phone: PHONES.student3, fullName: 'Jasur Mirzaev', gender: Gender.MALE, groupId: group2.id },
    { phone: PHONES.student4, fullName: 'Nodira Xasanova', gender: Gender.FEMALE, groupId: group2.id },
    { phone: PHONES.student5, fullName: 'Otabek Nazarov', gender: Gender.MALE, groupId: group3.id },
  ];

  const createdStudentIds: string[] = [];
  for (const s of studentsData) {
    const hash = await hashPassword('Student123!');
    const user = await prisma.user.upsert({
      where: { phone: s.phone },
      update: {},
      create: {
        phone: s.phone,
        passwordHash: hash,
        role: Role.STUDENT,
      },
    });
    const created = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: s.fullName,
        phone: s.phone,
        gender: s.gender,
      },
    });
    // Link to group via the m2m table.
    await prisma.studentGroup.upsert({
      where: {
        studentId_groupId: { studentId: created.id, groupId: s.groupId },
      },
      update: {},
      create: {
        studentId: created.id,
        groupId: s.groupId,
        monthlyFee: 500000,
      },
    });
    createdStudentIds.push(created.id);
  }
  console.log('Created 5 students');

  // Parents (2 parents linked to first 2 students)
  const parentsData = [
    { phone: PHONES.parent1, fullName: 'Karim Karimov', studentId: createdStudentIds[0] },
    { phone: PHONES.parent2, fullName: 'Yusuf Yusupov', studentId: createdStudentIds[1] },
  ];

  for (const p of parentsData) {
    const hash = await hashPassword('Parent123!');
    const user = await prisma.user.upsert({
      where: { phone: p.phone },
      update: {},
      create: {
        phone: p.phone,
        passwordHash: hash,
        role: Role.PARENT,
      },
    });
    const parent = await prisma.parent.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: p.fullName,
        phone: p.phone,
      },
    });
    await prisma.parentStudent.upsert({
      where: {
        parentId_studentId: { parentId: parent.id, studentId: p.studentId },
      },
      update: {},
      create: {
        parentId: parent.id,
        studentId: p.studentId,
      },
    });
  }
  console.log('Created 2 parents');

  // Audit log for seed
  await prisma.auditLog.create({
    data: {
      userId: superAdminUser.id,
      action: 'SEED',
      entity: 'System',
      details: { seededAt: new Date().toISOString() },
    },
  });

  console.log('\nSeeding complete!');
  console.log('');
  console.log('Test credentials (login by phone):');
  console.log(`  Super Admin: ${PHONES.superAdmin} / 123456`);
  console.log(`  Admin:       ${PHONES.admin} / 123456`);
  console.log(`  Teacher 1:   ${PHONES.teacher1} / Teacher123!`);
  console.log(`  Teacher 2:   ${PHONES.teacher2} / Teacher123!`);
  console.log(`  Student 1:   ${PHONES.student1} / Student123!`);
  console.log(`  Parent 1:    ${PHONES.parent1} / Parent123!`);
}

main()
  .catch((e) => {
    if (isDatabaseUnreachable(e)) {
      printDatabaseHelp();
    } else {
      console.error(e);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

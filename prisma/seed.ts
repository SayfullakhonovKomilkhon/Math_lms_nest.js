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

  // Admin
  const adminHash = await hashPassword('123456');
  await prisma.user.upsert({
    where: { email: 'admin@math.com' },
    update: { passwordHash: adminHash },
    create: {
      email: 'admin@math.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log('Created admin: admin@math.com');

  // Teacher
  const teacherHash = await hashPassword('123456');
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@math.com' },
    update: { passwordHash: teacherHash },
    create: {
      email: 'teacher@math.com',
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
      phone: '+998900000001',
      ratePerStudent: 50000,
    },
  });
  console.log('Created teacher: teacher@math.com');

  // Student
  const studentHash = await hashPassword('123456');
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@math.com' },
    update: { passwordHash: studentHash },
    create: {
      email: 'student@math.com',
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
      gender: Gender.MALE,
      monthlyFee: 500000,
    },
  });
  console.log('Created student: student@math.com');

  // Parent
  const parentHash = await hashPassword('123456');
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@math.com' },
    update: { passwordHash: parentHash },
    create: {
      email: 'parent@math.com',
      passwordHash: parentHash,
      role: Role.PARENT,
    },
  });
  await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      fullName: 'Default Parent',
      studentId: student.id,
    },
  });
  console.log('Created parent: parent@math.com');

  // Super Admin
  const superAdminHash = await hashPassword('123456');
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@math.com' },
    update: { passwordHash: superAdminHash },
    create: {
      email: 'superadmin@math.com',
      passwordHash: superAdminHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log('Created super admin: superadmin@math.com');

  // Teacher 1
  const teacher1Hash = await hashPassword('Teacher123!');
  const teacher1User = await prisma.user.upsert({
    where: { email: 'teacher1@mathcenter.uz' },
    update: {},
    create: {
      email: 'teacher1@mathcenter.uz',
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
      phone: '+998901111111',
      ratePerStudent: 50000,
    },
  });
  console.log('Created teacher 1:', teacher1.fullName);

  // Teacher 2
  const teacher2Hash = await hashPassword('Teacher123!');
  const teacher2User = await prisma.user.upsert({
    where: { email: 'teacher2@mathcenter.uz' },
    update: {},
    create: {
      email: 'teacher2@mathcenter.uz',
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
      phone: '+998902222222',
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
    { email: 'student1@mathcenter.uz', fullName: 'Alisher Karimov', gender: Gender.MALE, groupId: group1.id },
    { email: 'student2@mathcenter.uz', fullName: 'Malika Yusupova', gender: Gender.FEMALE, groupId: group1.id },
    { email: 'student3@mathcenter.uz', fullName: 'Jasur Mirzaev', gender: Gender.MALE, groupId: group2.id },
    { email: 'student4@mathcenter.uz', fullName: 'Nodira Xasanova', gender: Gender.FEMALE, groupId: group2.id },
    { email: 'student5@mathcenter.uz', fullName: 'Otabek Nazarov', gender: Gender.MALE, groupId: group3.id },
  ];

  const createdStudentIds: string[] = [];
  for (const s of studentsData) {
    const hash = await hashPassword('Student123!');
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: hash,
        role: Role.STUDENT,
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: s.fullName,
        gender: s.gender,
        groupId: s.groupId,
        monthlyFee: 500000,
      },
    });
    createdStudentIds.push(student.id);
  }
  console.log('Created 5 students');

  // Parents (2 parents linked to first 2 students)
  const parentsData = [
    { email: 'parent1@mathcenter.uz', fullName: 'Karim Karimov', studentId: createdStudentIds[0] },
    { email: 'parent2@mathcenter.uz', fullName: 'Yusuf Yusupov', studentId: createdStudentIds[1] },
  ];

  for (const p of parentsData) {
    const hash = await hashPassword('Parent123!');
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        passwordHash: hash,
        role: Role.PARENT,
      },
    });
    await prisma.parent.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: p.fullName,
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
  console.log('Test credentials:');
  console.log('  Super Admin: admin@mathcenter.uz / Admin123!');
  console.log('  Admin:       manager@mathcenter.uz / Admin123!');
  console.log('  Teacher 1:   teacher1@mathcenter.uz / Teacher123!');
  console.log('  Teacher 2:   teacher2@mathcenter.uz / Teacher123!');
  console.log('  Student 1:   student1@mathcenter.uz / Student123!');
  console.log('  Parent 1:    parent1@mathcenter.uz / Parent123!');
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

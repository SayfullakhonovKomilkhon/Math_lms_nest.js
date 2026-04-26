import { PartialType } from '@nestjs/swagger';
import { CreateExpenseDto } from './create-expense.dto';

// All fields optional — admin can patch any subset (e.g. fix the amount or
// move the entry to a different date). Receipt file replacement is handled
// out-of-band via the dedicated /:id/receipt endpoint.
export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

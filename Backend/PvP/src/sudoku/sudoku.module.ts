import { Module } from '@nestjs/common';
import { SudokuService } from './sudoku.service';

@Module({
  providers: [SudokuService],
  exports: [SudokuService],
})
export class SudokuModule {}

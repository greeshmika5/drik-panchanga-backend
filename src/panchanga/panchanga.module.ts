import { Module } from '@nestjs/common';
import { PanchangaService } from './panchanga.service';
import { PanchangaController } from './panchanga.controller';
import { AiRefinementService } from './ai-refinement.service';

@Module({
  controllers: [PanchangaController],
  providers: [PanchangaService, AiRefinementService],
  exports: [PanchangaService, AiRefinementService],
})
export class PanchangaModule {}

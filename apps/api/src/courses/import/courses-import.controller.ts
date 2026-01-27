import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CoursesImportService } from "./courses-import.service";

@ApiTags("courses")
@Controller("courses")
export class CoursesImportController {
  constructor(private readonly importService: CoursesImportService) {}

  @Post("import")
  @ApiOperation({ summary: "Import courses from an Excel file (.xlsx) with sheets CH/DE/AT" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async importXlsx(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException("No file uploaded (field name must be 'file').");
    return this.importService.importXlsx(file.buffer);
  }
}

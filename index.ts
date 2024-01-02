import express, { Request, Response } from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import cors from 'cors';
import { diffLines, Change } from 'diff';
import * as fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use( cors() )

interface Difference {
    status: string;
    value: string;
    line: number;
    file: number;
}

async function readPDF(filePath: string): Promise<string> {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
}

app.post('/compare', upload.array('pdfFiles', 2), async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];

       if (files && files.length === 2) {
        const [text1, text2] = await Promise.all([
            readPDF(files[0].path),
            readPDF(files[1].path)
        ]);

        const diff = diffLines(text1, text2);
        let differences: Difference[] = [];
        let lineCounter1 = 0;
        let lineCounter2 = 0;      

        // console.log('diff', diff)
        diff.forEach((part: Change) => {
            // Split the part into lines for detailed output
            const lines = part.value.split('\n');
            lines.forEach((line, idx) => {
              // Avoid adding empty lines after split
              if (line || idx < lines.length - 1) {
                if (part.added) {
                  differences.push({ status: 'Added', value: line, line: lineCounter2++, file: 2 });
                } else if (part.removed) {
                  differences.push({ status: 'Removed', value: line, line: lineCounter1++, file: 1 });
                } else {
                  lineCounter1++;
                  lineCounter2++;
                }
              }
            });
          });

        res.json({ different: differences.length > 0, differences });
    } else {
        res.status(400).send('Two PDF files are required.');
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

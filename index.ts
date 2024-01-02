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

        // console.log('diff', diff)
        diff.forEach((part: Change) => {
            if (part.added || part.removed) {
                const status = part.added ? 'Added' : 'Removed';
                differences.push({ status, value: part.value });
            }
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

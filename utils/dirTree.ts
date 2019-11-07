import { lstatSync, readdirSync } from 'fs';
import { basename } from 'path';

interface Info {
    path: string;
    name: string;
    type?: 'folder' | 'file';
    children?: Info[];
}

export default function dirTree(filename) {
    const stats = lstatSync(filename);
    const info: Info = {
        path: filename,
        name: basename(filename),
    };

    if (stats.isDirectory()) {
        info.type = 'folder';
        info.children = readdirSync(filename).map((child) => {
            return dirTree(`${filename}/${child}`);
        });
    } else {
        // Assuming it's a file. In real life it could be a symlink or
        // something else!
        info.type = 'file';
    }

    return info;
}

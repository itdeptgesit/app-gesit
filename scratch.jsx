import React from 'react';
import { renderToString } from 'react-dom/server';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './components/ui/dropdown-menu.js';

try {
  const html = renderToString(
    <DropdownMenu>
      <DropdownMenuTrigger render={<button>Open</button>} />
      <DropdownMenuContent>
        <DropdownMenuItem>Item 1</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  console.log("Success:", html);
} catch (err) {
  console.error("Render Error:", err);
}

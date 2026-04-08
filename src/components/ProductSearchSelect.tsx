"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ProductOption {
  id: number;
  code: string;
  name: string;
  steel_type?: string | null;
  side_steel?: string | null;
}

interface ProductSearchSelectProps {
  products: ProductOption[];
  value: number | null;
  onChange: (productId: string) => void;
  className?: string;
}

export default function ProductSearchSelect({ products, value, onChange, className }: ProductSearchSelectProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getDisplayName = (p: ProductOption) => {
    const parts = [p.name];
    if (p.steel_type) parts.push(p.steel_type);
    if (p.side_steel && p.side_steel !== 'unspecified') parts.push(p.side_steel === 'hide' ? 'ไม่แสดงเหล็กข้าง' : 'แสดงเหล็กข้าง');
    return parts.join(' - ');
  };

  const selected = products.find(p => p.id === value);

  const filtered = search
    ? products.filter(p => {
        const s = search.toLowerCase();
        const display = `${p.code} ${p.name} ${p.steel_type || ''}`;
        return display.toLowerCase().includes(s);
      })
    : products;

  // Calculate dropdown position
  const updatePosition = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Update position on scroll/resize when open
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && listRef.current) {
      const el = listRef.current.children[highlightIdx] as HTMLElement;
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, open]);

  const handleSelect = (productId: string) => {
    onChange(productId);
    setOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    const optionsCount = filtered.length + 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(prev => (prev + 1) % optionsCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(prev => (prev - 1 + optionsCount) % optionsCount);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx === 0) {
        handleSelect("");
      } else {
        const product = filtered[highlightIdx - 1];
        if (product) handleSelect(String(product.id));
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  const openDropdown = () => {
    updatePosition();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      <div
        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-green-500 cursor-pointer flex items-center gap-1 bg-white"
        onClick={openDropdown}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setHighlightIdx(0); }}
            onKeyDown={handleKeyDown}
            className="w-full outline-none bg-transparent text-sm"
            placeholder="ค้นหาสินค้า..."
            autoFocus
          />
        ) : (
          <span className={`truncate flex-1 ${selected ? "text-gray-900" : "text-gray-400"}`}>
            {selected ? `${selected.code} - ${getDisplayName(selected)}` : "-- กำหนดเอง --"}
          </span>
        )}
        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>

      {open && createPortal(
        <ul
          ref={listRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <li
            className={`px-3 py-2 text-sm cursor-pointer ${highlightIdx === 0 ? "bg-green-50 text-green-700" : "text-gray-500 hover:bg-gray-50"}`}
            onMouseEnter={() => setHighlightIdx(0)}
            onClick={() => handleSelect("")}
          >
            -- กำหนดเอง --
          </li>
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-400">ไม่พบสินค้า</li>
          )}
          {filtered.map((p, i) => (
            <li
              key={p.id}
              className={`px-3 py-2 text-sm cursor-pointer ${highlightIdx === i + 1 ? "bg-green-50 text-green-700" : "text-gray-700 hover:bg-gray-50"}`}
              onMouseEnter={() => setHighlightIdx(i + 1)}
              onClick={() => handleSelect(String(p.id))}
            >
              <span className="font-medium text-gray-500">{p.code}</span>{" "}
              <span>{getDisplayName(p)}</span>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

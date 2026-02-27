import { DEFAULT_COLOURS } from '../../utils/constants';

interface ColourPickerProps {
  value: string;
  onChange: (colour: string) => void;
}

export function ColourPicker({ value, onChange }: ColourPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {DEFAULT_COLOURS.map((colour) => (
        <button
          key={colour}
          onClick={() => onChange(colour)}
          className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
            value === colour ? 'ring-2 ring-offset-2 ring-blue-500' : ''
          }`}
          style={{ backgroundColor: colour }}
        />
      ))}
    </div>
  );
}

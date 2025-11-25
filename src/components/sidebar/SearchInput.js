export default function SearchInput({ value, onChange, placeholder = 'Search friends' }) {
  return (
    <div className="mb-3">
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-white/15 hover:bg-white/20 text-gray-300 py-2.5 px-4 rounded-3xl transition-all duration-300 ease-in-out placeholder-gray-400 outline-none"
      />
    </div>
  );
}

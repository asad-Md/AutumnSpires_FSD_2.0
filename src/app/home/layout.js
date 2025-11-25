import Sidebar from "@/components/sidebar/sidebar";
// import walls from "@/public/walls.png";

export const metadata = {
  title: "Austere Home",
  description: "autspire",
};

export default function HomeLayout({ children }) {
  return (
    <div className='fixed inset-0 flex text-white w-full h-screen bg-black'>
      <Sidebar />
      <div className='flex-1 flex flex-col overflow-hidden'>
        <div className='flex-1 flex items-center justify-center'>
          {children}
        </div>
      </div>
    </div>
  );
}

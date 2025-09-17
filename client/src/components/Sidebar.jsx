const Sidebar = ({sidebarOpen, setSidebarOpen}) => {
  return (
    <div
      className={`w-60 xl:w-72 bg-white border-r border-gray-200 flex flex-col justify-between items-center max-sm:absolute top-0 bottom-0 z-20`}
    ></div>
  );
};

export default Sidebar;

const AdminCardLoading = () => {
    return <div className="flex items-center justify-between bg-gray-400 animate-pulse p-8 rounded-3xl">
        <div className="flex items-center">
            <div className="h-24 w-24 capitalize rounded-full text-[57px] p-4 bg-gray-300 animate-pulse text-career-blue-500 flex items-center justify-center mr-2 text-20 font-medium" />
            <div className="flex flex-col">
                <div className="flex">
                    <div className="bg-gray-300 animate-pulse w-72 h-9 rounded-md mb-2" />
                    <div className="bg-gray-300 animate-pulse w-16 ml-6 h-6 rounded-md mt-2" />
                </div>
                <div className="bg-gray-300 animate-pulse w-12 h-6 rounded-md mt-2" />
            </div>
        </div>
        <div className="flex items-center flex-col sm:flex-row">
            <div className="bg-gray-300 animate-pulse w-72 h-12 rounded-md mr-4" />
            <div className="bg-gray-300 animate-pulse w-12 h-12 rounded-md" />
        </div>
    </div>
}

export default AdminCardLoading
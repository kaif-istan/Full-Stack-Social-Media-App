import { useEffect, useState } from "react";
import { dummyPostsData } from "../assets/assets";
import Loading from "../components/Loading";
import StoriesBar from "../components/StoriesBar";

const Feed = () => {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFeeds = async () => {
    setFeeds(dummyPostsData);
  };
  useEffect(() => {
    fetchFeeds();
  }, []);
  return !loading ? (
    <div className="h-full overflow-y-scroll no-scrollbar py-10 xl:pr-5 flex items-start justify-center xl:gap-8">
      {/* Stories and Post list */}
      <div>
        <StoriesBar />
        <div className="p-4 space-y-6">List of post</div>
      </div>
      {/* Right Sidebar */}
      <div>
        <div>
          <h1>Sponsored</h1>
        </div>
        <h1>Recent messages</h1>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default Feed;

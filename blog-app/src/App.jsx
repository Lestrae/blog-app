import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supbaseClient";

function App() {
  const [session, setSession] = useState(null);
  const [articles, setArticles] = useState([]);
  const [newArticle, setNewArticle] = useState({ title: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (!error) setArticles(data);
    } finally {
      setLoading(false);
    }
  }, []);

    const validateSession = (session) => {
      if (!session) return false;
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      return session.expires_at > currentTime;
    };
  
    useEffect(() => {
      supabase.auth.getSession().then(async ({ data: { session }, error }) => {
        if (error || !validateSession(session)) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
        setSession(session);
        if (session) await fetchArticles();
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
        if (session?.user) {
          setTimeout(async () => {
            // Call database here !
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();
          })
        }
      });
  
      return () => subscription?.unsubscribe();
    }, [fetchArticles]);

  useEffect(() => {
    if (!session) return;
  
    const channel = supabase
      .channel("articles-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "articles",
        },
        (payload) => {
          console.log("Change received:", payload);
          if (payload.eventType === "INSERT") {
            setArticles(prev => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setArticles(prev => prev.map(article => 
              article.id === payload.new.id ? payload.new : article
            ));
          } else if (payload.eventType === "DELETE") {
            setArticles(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
      alert("Session expired. Please log in again.");
      return;
    }
    try {
      if (editingId) {
        const { data, error } = await supabase
          .from("articles")
          .update({
            ...newArticle,
            updated_at: new Date().toISOString(),
            user_id: session.user.id 
          })
          .eq("id", editingId)
          .eq("user_id", session.user.id); // for RLS compliance
      
        if (error) throw error;
        setEditingId(null);
        setNewArticle({ title: "", description: "" });
      
      } else {
        const { data, error } = await supabase.from("articles").insert({
          ...newArticle,
          user_id: session.user.id,
          user_name: session.user.user_metadata.name || session.user.email,
          avatar: session.user.user_metadata.avatar_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
  
        if (error) throw error;
        setNewArticle({ title: "", description: "" });
      }
    } catch (error) {
      console.error("Operation failed:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!session) {
      alert("Session expired. Please log in again.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this article?")) {
      try {
        await supabase
          .from("articles")
          .delete()
          .eq("id", id)
          .eq("user_id", session.user.id);
      } catch (error) {
        console.error("Delete failed:", error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-us", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => supabase.auth.signInWithOAuth({ 
            provider: "google", 
            options: {
            scopes: 'https://www.googleapis.com/auth/userinfo.profile' } 
        })}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Sign in with Google to continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-pretty bg-neutral-800 bg-linear-to-t/srgb from-indigo-500 to-teal-400 p-4">
      <div className="max-w-4xl mx-auto text-pretty">
        <div className="flex justify-between shadow-lg shadow-black text-pretty items-center mb-8 p-4 bg-black backdrop-blur-sm opacity-85 rounded shadow">
          <div>
            <p className="font-semibold">{session.user.user_metadata.name}</p>
            <button
              onClick={() => {
                setSession(null);  // Immediately clear local session
                supabase.auth.signOut().catch(console.error);
              }}
              className="text-sm text-gray-200 hover:text-red-700 p-1 bg-linear-to-b/srgb from-gray-800 to-gray-900 p-3 opacity-85"
            >
              Sign out
            </button>
          </div>
          <img
            src={session.user.user_metadata.avatar_url}
            alt="User avatar"
            className="w-10 h-10 rounded-full"
          />
        </div>

        <form onSubmit={handleSubmit} className="mb-8 text-pretty shadow-lg shadow-black bg-black backdrop-blur-sm opacity-85 p-4 rounded shadow">
          <input
            type="text"
            placeholder="Article Title"
            value={newArticle.title}
            onChange={(e) => setNewArticle(prev => ({ ...prev, title: e.target.value }))}
            className="w-full mb-2 p-2 border-1 border-indigo-500 rounded text-white text-pretty break-words opacity-85"
            required
          />
          <textarea
            placeholder="Article Content"
            value={newArticle.description}
            onChange={(e) => setNewArticle(prev => ({ ...prev, description: e.target.value }))}
            className="w-full mb-2 p-2 border-1 border-indigo-500 rounded h-32 text-white text-pretty opacity-85"
            required
          />
          <div className="flex text-pretty justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewArticle({ title: "", description: "" });
                }}
                className="px-4 py-2 text-orange-400 hover:text-gray-800 bg-linear-to-b/srgb from-gray-800 to-gray-900 p-3 opacity-85"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-blue-400 rounded hover:bg-blue-700 bg-linear-to-b/srgb from-gray-800 to-gray-900 p-3 opacity-85"
            >
              {editingId ? "Update Article" : "Post Article"}
            </button>
          </div>
        </form>

        <div className="space-y-4 text-pretty">
          {articles.map((article) => (
            <div key={article.id} className="bg-black shadow-lg shadow-black text-wrap backdrop-blur-sm opacity-85 p-4 rounded shadow">
              <div className="flex text-pretty items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={article.avatar}
                    alt="Author"
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="text-pretty">
                    <p className="font-semibold text-blue-400">{article.user_name}</p>
                    <p className="text-sm text-pretty text-teal-700">
                      {formatDate(article.updated_at || article.created_at)}
                      {article.updated_at && ""}
                    </p>
                  </div>
                </div>
                {article.user_id === session.user.id && (
                  <div className="flex gap-1 p-0">
                    <button
                      onClick={() => {
                        setEditingId(article.id);
                        setNewArticle({
                          title: article.title,
                          description: article.description,
                        });
                      }}
                      className="text-blue-600 hover:text-blue-800 bg-linear-to-b/srgb from-gray-800 to-gray-900 p-3 opacity-85"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="text-teal-600 hover:text-red-800 bg-linear-to-b/srgb from-gray-800 to-gray-900 p-3"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <h2 className="text-xl text-gray-300 font-bold mb-2 break-words">{article.title}</h2>
              <p className="text-gray-400 text-pretty whitespace-pre-wrap break-words">
                {article.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
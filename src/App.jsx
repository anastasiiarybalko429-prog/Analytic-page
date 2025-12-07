import { useState, useEffect } from "react";
import "./App.css";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function UsersDashboard() {
  const [users, setUsers] = useState([]);
  const [todos, setTodos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(1);
  const [activePage, setActivePage] = useState("chart");;

  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [showPostsCount, setShowPostsCount] = useState(true);
  const [showCommentsCount, setShowCommentsCount] = useState(true);


  // -------------------- LOAD DATA --------------------
  useEffect(() => {
    const loadData = async () => {
      const [usersRes, todosRes, postsRes, commentsRes] = await Promise.all([
        fetch("https://jsonplaceholder.typicode.com/users"),
        fetch("https://jsonplaceholder.typicode.com/todos"),
        fetch("https://jsonplaceholder.typicode.com/posts"),
        fetch("https://jsonplaceholder.typicode.com/comments")
      ]);

      const [usersData, todosData, postsData, commentsData] = await Promise.all([
        usersRes.json(),
        todosRes.json(),
        postsRes.json(),
        commentsRes.json()
      ]);

      setUsers(usersData);
      setTodos(todosData);
      setPosts(postsData);
      setComments(commentsData);
    };

    loadData().catch(console.error);
  }, []);


  // -------------------- UTIL FUNCTIONS --------------------
  const countComments = (array, postId) => array.filter(c => c.postId === postId).length;
  const countPosts = (array, userId) => array.filter(p => p.userId === userId).length;
  const countTodoesTrue = (array, userId) => array.filter(t => t.userId === userId && t.completed).length;

  const todosTrue = todos.filter(t => t.completed);
  const todosFalse = todos.filter(t => !t.completed);

  const easy = (total, base) => (base ? (total / base).toFixed(1) : 0);

  const averageTodos = easy(todos.length, users.length);
  const averageTodosTrue = easy(todosTrue.length, users.length);
  const averageTodosFalse = easy(todosFalse.length, users.length);
  const averagePosts = easy(posts.length, users.length);
  const averageComments = easy(comments.length, posts.length);


  // -------------------- PIE CHART --------------------
  const todosUserTrue = todos.filter(t => t.userId === selectedUserId && t.completed);
  const todosUserFalse = todos.filter(t => t.userId === selectedUserId && !t.completed);

  const pieData = {
    labels: ["Completed tasks", "Not completed tasks"],
    datasets: [
      {
        data: [todosUserTrue.length, todosUserFalse.length],
        backgroundColor: ["#00ff08ff", "#ff0400ff"],
        borderColor: "#fff",
        borderWidth: 2
      }
    ]
  };

  const pieOptions = {
    plugins: {
      legend: { labels: { color: "#fff" } }
    }
  };


  // -------------------- BAR CHART --------------------
  const getCompletedTasks = userId => countTodoesTrue(todos, userId);
  const getPostsCount = userId => countPosts(posts, userId);
  const getCommentsCount = userId =>
    posts
      .filter(p => p.userId === userId)
      .reduce((sum, post) => sum + countComments(comments, post.id), 0);

  const barDatasets = [
    showCompletedTasks && {
      label: "Completed tasks",
      data: users.map(u => getCompletedTasks(u.id)),
      backgroundColor: "#00ff08ff"
    },
    showPostsCount && {
      label: "Posts count",
      data: users.map(u => getPostsCount(u.id)),
      backgroundColor: "#ffae00ff"
    },
    showCommentsCount && {
      label: "Comments count",
      data: users.map(u => getCommentsCount(u.id)),
      backgroundColor: "#bf00ffff"
    }
  ].filter(Boolean);

  const barData = {
    labels: users.map(u => u.name),
    datasets: barDatasets
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: { color: "#fff" }
      }
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true }
    }
  };


  // -------------------- TOP USERS --------------------
  const usersWithStats = users.map(user => {
    const completedTasks = getCompletedTasks(user.id);
    const userPosts = posts.filter(p => p.userId === user.id);
    const postsCount = userPosts.length;
    const commentsCount = userPosts.reduce((sum, post) => sum + countComments(comments, post.id), 0);
    const totalPoints = completedTasks + postsCount + commentsCount;

    return { ...user, completedTasks, postsCount, commentsCount, totalPoints };
  });

  const sortedUsers = [...usersWithStats].sort((a, b) => b.totalPoints - a.totalPoints);

  let lastPoints = null;
  let place = 0;
  const topUsers = [];

  for (let i = 0; i < sortedUsers.length; i++) {
    const user = sortedUsers[i];
    if (user.totalPoints !== lastPoints) place += 1;
    if (place > 3) break; //max 3 places but NOT 3 users
    lastPoints = user.totalPoints;
    topUsers.push({ ...user, place });
  }


  // -------------------- TOP POSTS --------------------
  const postsWithComments = posts.map(post => ({...post, commentCount: countComments(comments, post.id)}));
  const sortedPosts = [...postsWithComments].sort((a, b) => b.commentCount - a.commentCount);

  let lastCount = null;
  let postPlace = 0;
  let topPosts = [];

  for (let i = 0; i < sortedPosts.length; i++) {
    const post = sortedPosts[i];
    if (post.commentCount !== lastCount) postPlace += 1;
    if (postPlace > 3) break; //max 3 places
    lastCount = post.commentCount;
    topPosts.push({ ...post, place: postPlace });
  }

  topPosts = topPosts.slice(0, 3); //max 3 posts

  
  // -------------------- RENDER --------------------
  return (
    <div className="dashboard-wrapper">
      <h1 className="page-title">User Dashboard</h1>

      <div className="switch-buttons">
        <button onClick={() => setActivePage("statistics")}>Statistics</button>
        <button onClick={() => setActivePage("tops")}>Tops</button>
      </div>


      {/* -------------------- STATISTICS PAGE -------------------- */}
      {activePage === "statistics" && (
        <div className="page-layout">
          <div className="left-side">
            <div className="block">
              <h2>Average Statistics</h2>
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>Average tasks per user</td><td>{averageTodos}</td></tr>
                  <tr><td>Average completed tasks per user</td><td>{averageTodosTrue}</td></tr>
                  <tr><td>Average NOT completed tasks per user</td><td>{averageTodosFalse}</td></tr>
                  <tr><td>Average posts per user</td><td>{averagePosts}</td></tr>
                  <tr><td>Average comments per post</td><td>{averageComments}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="right-side">
            <div className="block">
              <label htmlFor="userSelect">Select User:</label>
              <select
                id="userSelect"
                value={selectedUserId}
                onChange={e => setSelectedUserId(Number(e.target.value))}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} (ID: {u.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="chart-block-pie">
              <Pie data={pieData} options={pieOptions} />
              <p>Completed: {todosUserTrue.length}</p>
              <p>Not Completed: {todosUserFalse.length}</p>
            </div>
          </div>
        </div>
      )}


      {/* -------------------- TOPS PAGE -------------------- */}
      {activePage === "tops" && (
        <div className="page-layout">
          <div className="left-side">

            <div className="block">
              <h2>Top Users</h2>
              <table>
                <thead>
                  <tr><th>Place</th><th>User</th><th>Points</th></tr>
                </thead>
                <tbody>
                  {topUsers.map(user => (
                    <tr key={user.id}>
                      <td>{user.place}</td>
                      <td>{user.name}</td>
                      <td>{user.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block">
              <h2>Top Posts by Comments</h2>
              <table>
                <thead>
                  <tr><th>Place</th><th>Post</th><th>Comments</th></tr>
                </thead>
                <tbody>
                  {topPosts.map(post => (
                    <tr key={post.id}>
                      <td>{post.place}</td>
                      <td>{post.title.length > 20 ? post.title.slice(0, 20) + "..." : post.title}</td>
                      <td>{post.commentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          <div className="right-side">
            <div className="block">
              <label>
                <input
                  type="checkbox"
                  checked={showCompletedTasks}
                  onChange={() => setShowCompletedTasks(!showCompletedTasks)}
                />
                Completed Tasks
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showPostsCount}
                  onChange={() => setShowPostsCount(!showPostsCount)}
                />
                Posts Count
              </label>

              <label>
                <input
                  type="checkbox"
                  checked={showCommentsCount}
                  onChange={() => setShowCommentsCount(!showCommentsCount)}
                />
                Comments Count
              </label>
            </div>

            <div className="chart-block-bar">
              <Bar
                data={barData}
                options={{...barOptions, maintainAspectRatio: false}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}